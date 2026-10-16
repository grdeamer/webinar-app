"""Restricted, bounded confidence preview. Media uses pipes and private tmpfs only."""
import fcntl
import os
from pathlib import Path
import socket
import struct
import subprocess
import threading
import time
from preview import decode_frame

DURATION = 120

def fresh_frame(root):
    try:
        return decode_frame((root / 'video.i420').read_bytes())
    except OSError:
        return None

def run(duration=DURATION):
    if not 0 < duration <= DURATION:
        raise ValueError("Preview duration must be bounded")
    lock = open('/run/jupiter-io/live-preview.lock', 'w')
    try:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        raise SystemExit(2)
    roots = sorted(Path('/run/jupiter-io').glob('jupiter-io-*'), key=lambda p: p.stat().st_mtime, reverse=True)
    root = next((p for p in roots if fresh_frame(p)), None)
    if root is None:
        raise SystemExit(3)
    first = fresh_frame(root)
    if first is None:
        raise SystemExit(3)
    width, height, _ = first
    audio = socket.socket(socket.AF_UNIX, socket.SOCK_DGRAM)
    path = root / f'preview-{os.getpid()}.sock'
    audio.bind(str(path)); path.chmod(0o600); audio.settimeout(.1)
    vr, vw = os.pipe(); ar, aw = os.pipe()
    deadline = time.monotonic() + duration
    stop = threading.Event()
    args = ['ffmpeg', '-v', 'error', '-nostdin', '-threads', '1', '-f', 'rawvideo', '-pixel_format', 'yuv420p', '-video_size', f'{width}x{height}', '-framerate', '10', '-i', f'pipe:{vr}', '-f', 's16le', '-ar', '32000', '-ac', '1', '-i', f'pipe:{ar}', '-vf', 'scale=854:480', '-c:v', 'libx264', '-threads', '1', '-preset', 'ultrafast', '-tune', 'zerolatency', '-profile:v', 'baseline', '-level:v', '3.1', '-b:v', '650k', '-g', '10', '-c:a', 'aac', '-b:a', '64k', '-ar', '32000', '-t', str(duration), '-movflags', 'frag_keyframe+empty_moov+default_base_moof', '-f', 'mp4', 'pipe:1']
    proc = None
    def video():
        try:
            with os.fdopen(vw, 'wb', buffering=0) as out:
                tick = time.monotonic()
                while not stop.is_set() and time.monotonic() < deadline:
                    frame = fresh_frame(root)
                    if frame is None or frame[:2] != (width, height): break
                    out.write(frame[2]); tick += .1
                    stop.wait(max(0, tick-time.monotonic()))
        except OSError: pass
        finally: stop.set()
    def sound():
        try:
            with os.fdopen(aw, 'wb', buffering=0) as out:
                while not stop.is_set() and time.monotonic() < deadline:
                    try: packet = audio.recv(2048)
                    except socket.timeout: continue
                    if len(packet) != 1320: continue
                    fields = struct.unpack('=8IQ', packet[:40])
                    if fields[0] == 0x4a494f31 and fields[4:7] == (1280, 32000, 1) and 0 <= time.monotonic()*1000-fields[8] < 500:
                        out.write(packet[40:])
        except OSError: pass
    try:
        proc = subprocess.Popen(args, pass_fds=(vr, ar), stderr=subprocess.DEVNULL)
        os.close(vr); os.close(ar)
        threading.Thread(target=video, daemon=True).start()
        threading.Thread(target=sound, daemon=True).start()
        while proc.poll() is None and not stop.wait(.2) and time.monotonic() < deadline: pass
    finally:
        stop.set()
        if proc and proc.poll() is None:
            proc.terminate()
            try: proc.wait(timeout=2)
            except subprocess.TimeoutExpired: proc.kill(); proc.wait()
        audio.close(); path.unlink(missing_ok=True)

if __name__ == '__main__': run()
