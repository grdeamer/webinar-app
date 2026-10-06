"""SRT -> ephemeral I420/PCM bus, with no recording files.
FFmpeg decodes one MPEG-TS input to bounded raw pipes; the sender owns A/V timestamps.
"""
import json, os, signal, socket, struct, subprocess, threading, time
from pathlib import Path
HEADER = struct.Struct('=8IQ')
def output_profile(settings):
    width, height = int(settings.get('width', 1920)), int(settings.get('height', 1080))
    fps = int(settings.get('fps', 15))
    if (width, height) not in ((1280, 720), (1920, 1080)) or fps != 15:
        raise ValueError('Supported relay profiles: 720p or 1080p at 15 fps')
    return width, height, fps

def stamp(size, width=0, height=0, rate=0, channels=0):
    return HEADER.pack(0x4a494f31,width,height,0,size,rate,channels,0,int(time.monotonic()*1000))

def exact(stream, size):
    result = bytearray()
    while len(result) < size:
        chunk = stream.read(size-len(result))
        if not chunk: return None
        result.extend(chunk)
    return bytes(result)

class Ingest:
    def __init__(self, root, settings, home):
        self.root, self.settings, self.home = Path(root), settings, Path(home)
        self.width, self.height, self.fps = output_profile(settings)
        self.frame_bytes = self.width * self.height * 3 // 2
        self.stop = threading.Event(); self.video_time = self.audio_time = 0
        self.frames = self.blocks = 0; self.proc = None
    def status(self):
        now=time.monotonic()
        return {'status':'receiving' if now-self.video_time<2 else 'starting','kind':'srt','presenter':'HDMI program','inputResolutions':f'{self.width}x{self.height}' if self.frames else '', 'video':now-self.video_time<2,'audio':now-self.audio_time<2,'videoFrames':self.frames,'audioBlocks':self.blocks,'error':''}
    def video(self, stream):
        while not self.stop.is_set():
            frame=exact(stream,self.frame_bytes)
            if frame is None: break
            temp=self.root/'video.tmp'
            with open(temp,'wb') as f: f.write(stamp(len(frame),self.width,self.height)+frame)
            temp.chmod(0o600);temp.replace(self.root/'video.i420')
            self.video_time=time.monotonic();self.frames+=1
    def audio(self, stream):
        sock=socket.socket(socket.AF_UNIX,socket.SOCK_DGRAM);sock.setblocking(False)
        try:
            while not self.stop.is_set():
                block=exact(stream,1280) # 20 ms, 32 kHz, mono PCM16
                if block is None: break
                packet=stamp(len(block),rate=32000,channels=1)+block
                for destination in self.root.glob('*.sock'):
                    try: sock.sendto(packet,str(destination))
                    except OSError: pass
                self.audio_time=time.monotonic();self.blocks+=1
        finally: sock.close()
    def run(self):
        self.home.mkdir(parents=True,exist_ok=True)
        while not self.stop.is_set():
            audio_read,audio_write=os.pipe()
            secret=Path(self.settings['passphraseFile']).read_text().strip()
            if not 10<=len(secret)<=64 or not secret.isalnum():raise ValueError('Invalid SRT passphrase')
            port=int(self.settings.get('port',9000))
            url=f'srt://0.0.0.0:{port}?mode=listener&transtype=live&latency=200000&passphrase={secret}&pbkeylen=32&enforced_encryption=1&timeout=5000000'
            args=['ffmpeg','-hide_banner','-loglevel','error','-nostdin','-threads','2','-i',url,
                '-map','0:v:0','-vf',f'scale={self.width}:{self.height}:force_original_aspect_ratio=decrease,pad={self.width}:{self.height}:(ow-iw)/2:(oh-ih)/2,fps={self.fps}','-pix_fmt','yuv420p','-f','rawvideo','pipe:1',
                '-map','0:a:0','-ac','1','-ar','32000','-f','s16le',f'pipe:{audio_write}']
            # Suppress FFmpeg stderr because network errors may include the secret URL.
            self.proc=subprocess.Popen(args,stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,pass_fds=(audio_write,),bufsize=0)
            os.close(audio_write)
            with os.fdopen(audio_read,'rb',buffering=0) as audio:
                video_thread=threading.Thread(target=self.video,args=(self.proc.stdout,),daemon=True)
                audio_thread=threading.Thread(target=self.audio,args=(audio,),daemon=True)
                video_thread.start();audio_thread.start()
                while self.proc.poll() is None and not self.stop.wait(.5):self.write_status()
                if self.proc.poll() is None:self.proc.terminate()
                try:self.proc.wait(timeout=5)
                except subprocess.TimeoutExpired:self.proc.kill();self.proc.wait()
                video_thread.join(timeout=3);audio_thread.join(timeout=3)
            self.proc.stdout.close();self.proc=None
            (self.root/'video.i420').unlink(missing_ok=True);self.video_time=self.audio_time=0
            self.stop.wait(1)
    def write_status(self):
        temp=self.home/'srt-status.tmp';temp.write_text(json.dumps(self.status()));temp.chmod(0o600);temp.replace(self.home/'srt-status.json')
    def close(self):
        self.stop.set()
        if self.proc and self.proc.poll() is None:self.proc.terminate()

if __name__=='__main__':
    import sys
    ingest=Ingest(sys.argv[1],json.loads(Path(sys.argv[2]).read_text()),sys.argv[3])
    signal.signal(signal.SIGTERM,lambda *_:ingest.close());signal.signal(signal.SIGINT,lambda *_:ingest.close())
    ingest.run()
