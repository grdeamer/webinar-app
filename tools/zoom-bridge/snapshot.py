#!/usr/bin/python3
"""Forced SSH command: encode one fresh program frame; no image persistence."""
import fcntl
import os
from pathlib import Path
import subprocess
from preview import decode_frame

lock = open('/tmp/jupiter-snapshot.lock', 'w')
try:
    fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
except BlockingIOError:
    raise SystemExit(2)
roots = sorted(Path('/dev/shm').glob('jupiter-io-*'), key=lambda p: p.stat().st_mtime, reverse=True)
frame = None
for root in roots:
    try:
        frame = decode_frame((root / 'video.i420').read_bytes())
        if frame: break
    except OSError: continue
if not frame: raise SystemExit(3)
w, h, pixels = frame
result = subprocess.run(['ffmpeg', '-v', 'error', '-threads', '1', '-f', 'rawvideo', '-pixel_format', 'yuv420p', '-video_size', f'{w}x{h}', '-i', 'pipe:0', '-vf', 'scale=1280:-2', '-frames:v', '1', '-threads', '1', '-f', 'image2pipe', '-c:v', 'mjpeg', '-q:v', '3', 'pipe:1'], input=pixels, capture_output=True, timeout=6, check=True)
if not 4 <= len(result.stdout) <= 1000000: raise SystemExit(4)
os.write(1, result.stdout)
