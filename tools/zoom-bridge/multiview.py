"""Outgoing confidence monitor: one bounded encoder, RAM-only leased worker copies."""
import fcntl
import math
import os
from pathlib import Path
import re
import shutil
import signal
import socket
import struct
import subprocess
import threading
import time
from live_preview import fresh_frame

UUID = r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'

def command(value):
    match = re.fullmatch(r'(satellite-grid|satellite-preview) ('+UUID+r'(?:,'+UUID+r'){0,8})', value)
    if not match: raise ValueError('Invalid monitor request')
    ids = match[2].split(',')
    if len(set(ids)) != len(ids) or (match[1] == 'satellite-preview' and len(ids) != 1): raise ValueError('Invalid monitor selection')
    return ids, match[1] == 'satellite-preview'

def tile(frame, width=256, height=144):
    out = bytearray(bytes([16])*(width*height)+bytes([128])*(width*height//2))
    if not frame: return out
    sw, sh, data = frame
    scale=min(width/sw,height/sh);rw=max(2,int(sw*scale)//2*2);rh=max(2,int(sh*scale)//2*2)
    x=(width-rw)//4*2;y=(height-rh)//4*2
    for p in range(3):
        div=2 if p else 1;source=0 if p==0 else sw*sh if p==1 else sw*sh*5//4
        dest=0 if p==0 else width*height if p==1 else width*height*5//4
        xs=[int(i*(sw//div)/(rw//div)) for i in range(rw//div)]
        for row in range(rh//div):
            start=source+int(row*(sh//div)/(rh//div))*(sw//div)
            line=data[start:start+sw//div]
            offset=dest+(y//div+row)*(width//div)+x//div
            out[offset:offset+rw//div]=bytes(line[i] for i in xs)
    return out

def compose(frames, columns):
    rows=math.ceil(len(frames)/columns);w,h=columns*256,rows*144
    out=bytearray(bytes([16])*(w*h)+bytes([128])*(w*h//2))
    for i,frame in enumerate(frames):
        data=tile(frame);x=i%columns*256;y=i//columns*144
        for p in range(3):
            div=2 if p else 1;src=0 if p==0 else 256*144 if p==1 else 256*144*5//4
            dst=0 if p==0 else w*h if p==1 else w*h*5//4
            for row in range(144//div):
                offset=dst+(y//div+row)*(w//div)+x//div
                out[offset:offset+256//div]=data[src+row*(256//div):src+(row+1)*(256//div)]
    return out

def run(ids, expanded, duration=120, base=Path('/run/jupiter-io')):
    if not 0 < duration <= 120 or not 1 <= len(ids) <= 9 or any(not re.fullmatch(UUID, rid) for rid in ids) or (expanded and len(ids)!=1): raise ValueError('Invalid monitor lease')
    lock=open(base/'multiview.lock','w')
    until=time.monotonic()+2
    while True:
        try: fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB);break
        except BlockingIOError:
            if time.monotonic()>until: raise SystemExit(2)
            time.sleep(.05)
    roots=sorted(base.glob('jupiter-io-*'),key=lambda p:p.stat().st_mtime,reverse=True)
    if not roots: raise SystemExit(3)
    root=roots[0];dirs=[];sock=None;proc=None;stop=threading.Event()
    previous={}
    if threading.current_thread() is threading.main_thread():
        for sig in (signal.SIGTERM, signal.SIGHUP):
            previous[sig]=signal.getsignal(sig);signal.signal(sig,lambda *_:stop.set())
    deadline=time.monotonic()+duration;fps=10 if expanded else 2
    columns=min(3,len(ids));width,height=(854,480) if expanded else (columns*256,math.ceil(len(ids)/columns)*144)
    vr,vw=os.pipe();ar,aw=os.pipe()
    try:
        for rid in ids:
            directory=root/('monitor-'+rid)
            directory.mkdir(mode=0o700,exist_ok=True);directory.chmod(0o700);dirs.append(directory)
            lease=directory/'lease';lease.write_text(f'{int(time.time()+duration)} {fps}');lease.chmod(0o600)
        if expanded:
            sock=socket.socket(socket.AF_UNIX,socket.SOCK_DGRAM);sock.bind(str(dirs[0]/'audio.sock'));sock.setblocking(False);(dirs[0]/'audio.sock').chmod(0o600)
        args=['ffmpeg','-v','error','-nostdin','-threads','1','-f','rawvideo','-pixel_format','yuv420p','-video_size',f'{width}x{height}','-framerate',str(fps),'-i',f'pipe:{vr}','-f','s16le','-ar','32000','-ac','1','-i',f'pipe:{ar}','-c:v','libx264','-threads','1','-preset','ultrafast','-tune','zerolatency','-profile:v','baseline','-level:v','3.1','-b:v','650k' if expanded else '350k','-g',str(fps),'-c:a','aac','-b:a','64k','-ar','32000','-t',str(duration),'-movflags','frag_keyframe+empty_moov+default_base_moof','-f','mp4','pipe:1']
        proc=subprocess.Popen(args,pass_fds=(vr,ar),stderr=subprocess.DEVNULL)
        os.close(vr);os.close(ar)
        def video():
            try:
                with os.fdopen(vw,'wb',buffering=0) as output:
                    tick=time.monotonic()
                    while not stop.is_set() and time.monotonic()<deadline:
                        frames=[fresh_frame(directory) for directory in dirs]
                        frame=tile(frames[0],width,height) if expanded else compose(frames,columns)
                        view=memoryview(frame)
                        while view and not stop.is_set():view=view[output.write(view):]
                        tick+=1/fps;stop.wait(max(0,tick-time.monotonic()))
            except OSError: pass
            finally: stop.set()
        def audio():
            pending=bytearray()
            try:
                with os.fdopen(aw,'wb',buffering=0) as output:
                    tick=time.monotonic()
                    while not stop.is_set() and time.monotonic()<deadline:
                        if sock:
                            for _ in range(16):
                                try: packet=sock.recv(8192)
                                except BlockingIOError: break
                                if len(packet)<40:continue
                                fields=struct.unpack('=8IQ',packet[:40])
                                if fields[0]==0x4a494f31 and fields[5:7]==(32000,1) and fields[4]==len(packet)-40 and 0<=time.monotonic()*1000-fields[8]<300:pending.extend(packet[40:])
                        if len(pending)>6400:pending.clear()
                        chunk=bytes(pending[:1280]);del pending[:1280]
                        output.write(chunk+bytes(1280-len(chunk)));tick+=.02;stop.wait(max(0,tick-time.monotonic()))
            except OSError: pass
        threading.Thread(target=video,daemon=True).start();threading.Thread(target=audio,daemon=True).start()
        while proc.poll() is None and not stop.wait(.1) and time.monotonic()<deadline:pass
    finally:
        stop.set()
        if proc and proc.poll() is None:
            proc.terminate()
            try:proc.wait(timeout=2)
            except subprocess.TimeoutExpired:proc.kill();proc.wait()
        if sock:sock.close()
        for directory in dirs:shutil.rmtree(directory,ignore_errors=True)
        for sig,handler in previous.items():signal.signal(sig,handler)


def cleanup_expired(root):
    for directory in Path(root).glob('monitor-*'):
        if not re.fullmatch('monitor-'+UUID,directory.name):continue
        try:
            if directory.is_symlink():continue
            until=int((directory/'lease').read_text().split()[0])
        except (OSError,ValueError,IndexError):until=0
        if until<=time.time() or until>time.time()+121:shutil.rmtree(directory,ignore_errors=True)
