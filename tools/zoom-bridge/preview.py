"""On-demand picture confidence monitor. Latest frames only, in private RAM.

JPEG encoding uses pipes; frames go directly to an authenticated ephemeral
Realtime broadcast. No media is written to the database or persistent storage.
"""
import datetime
import shutil
import struct
import subprocess
import threading
import time
import urllib.request


def decode_frame(raw):
    if len(raw) < 40: return None
    magic, width, height, rotation, size, _, _, _, stamp = struct.unpack('<8IQ', raw[:40])
    age = time.monotonic() * 1000 - stamp
    if magic != 0x4a494f31 or not 0 <= age < 2000 or rotation or width < 2 or height < 2 or width > 1920 or height > 1080 or width % 2 or height % 2 or size != width * height * 3 // 2 or len(raw) != size + 40:
        return None
    return width, height, raw[40:]


class Preview:
    def __init__(self, root, settings):
        self.root = root
        self.settings = settings
        self.requests = {}
        self.lock = threading.Lock()
        self.stopped = threading.Event()
        self.thread = threading.Thread(target=self.run, daemon=True)

    def start(self):
        self.thread.start()

    def request(self, room):
        try:
            expires = int(datetime.datetime.fromisoformat((room.get('previewUntil') or '').replace('Z', '+00:00')).timestamp())
        except (ValueError, TypeError):
            expires = 0
        expires = min(expires, int(time.time()) + 45) if room['running'] else 0
        path = self.root / ('preview-' + room['id'])
        with self.lock:
            if expires > time.time():
                path.mkdir(mode=0o700, exist_ok=True)
                self.requests[room['id']] = expires
            else:
                self.requests.pop(room['id'], None)
                shutil.rmtree(path, ignore_errors=True)
        return expires

    def run(self):
        while not self.stopped.wait(2):
            with self.lock:
                requests = list(self.requests.items())
            for rid, expires in requests:
                if self.stopped.is_set(): return
                if expires <= time.time():
                    shutil.rmtree(self.root / ('preview-' + rid), ignore_errors=True)
                    continue
                try:
                    raw = (self.root / ('preview-' + rid) / 'video.i420').read_bytes()
                    frame = decode_frame(raw)
                    if frame is None: continue
                    width, height, pixels = frame
                    encoded = subprocess.run(['ffmpeg', '-v', 'error', '-threads', '1', '-f', 'rawvideo', '-pixel_format', 'yuv420p', '-video_size', f'{width}x{height}', '-i', 'pipe:0', '-vf', 'scale=640:-2', '-frames:v', '1', '-threads', '1', '-f', 'image2pipe', '-c:v', 'mjpeg', '-q:v', '5', 'pipe:1'], input=pixels, capture_output=True, timeout=3, check=True).stdout
                    if len(encoded) > 180000: continue
                    req = urllib.request.Request(self.settings['url'].rstrip('/') + '/api/zoom-bridge/preview', data=encoded, headers={'Content-Type': 'image/jpeg', 'X-Satellite-Id': rid, 'Authorization': 'Bearer ' + self.settings['token']})
                    with urllib.request.urlopen(req, timeout=5) as response:
                        response.read(1024)
                except (OSError, ValueError, struct.error, subprocess.SubprocessError):
                    # A stopped sender, closed preview, or temporary network error
                    # must never interfere with the live broadcast controller.
                    continue

    def close(self):
        self.stopped.set()
        self.thread.join(timeout=10)
