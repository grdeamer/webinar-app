"""On-demand picture confidence monitor. Latest frames only, in private RAM.

JPEG encoding uses pipes; frames go directly to an authenticated ephemeral
Realtime broadcast. No media is written to the database or persistent storage.
"""
import configparser
import json
import math
from pathlib import Path
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
        self.meter_thread = threading.Thread(target=self.meters, daemon=True)

    def start(self):

        self.meter_thread.start()

    def request(self, room):
        try:
            expires = int(datetime.datetime.fromisoformat((room.get('previewUntil') or '').replace('Z', '+00:00')).timestamp())
        except (ValueError, TypeError):
            expires = 0
        expires = min(expires, int(time.time()) + 45) if room['running'] else 0
        with self.lock:
            if expires > time.time(): self.requests[room['id']] = expires
            else: self.requests.pop(room['id'], None)
        # Meter leases never enable worker picture copies.
        return 0

    def meters(self):
        while not self.stopped.wait(0.5):
            with self.lock:
                requests = list(self.requests.items())
            for rid, expires in requests:
                if expires <= time.time(): continue
                try:
                    cfg = configparser.ConfigParser(interpolation=None)
                    cfg.read(Path.home() / 'jupiter-zoom' / 'rooms' / rid / 'status.ini')
                    status = cfg['worker']
                    stamp = status.getfloat('audioMeterStamp', 0)
                    if status.get('status') != 'joined' or not 0 <= time.monotonic() * 1000 - stamp < 1500: continue
                    peak, rms = status.getfloat('audioPeak', 0), status.getfloat('audioRms', 0)
                    if not all(math.isfinite(v) and 0 <= v <= 1 for v in (peak, rms)): continue
                    payload = json.dumps({'peak': peak, 'rms': rms, 'muted': not status.getboolean('microphone', False)}).encode()
                    req = urllib.request.Request(self.settings['url'].rstrip('/') + '/api/zoom-bridge/preview', data=payload, headers={'Content-Type': 'application/json', 'X-Satellite-Id': rid, 'Authorization': 'Bearer ' + self.settings['token']})
                    with urllib.request.urlopen(req, timeout=3) as response: response.read(1024)
                except (OSError, ValueError, KeyError, configparser.Error): continue

    def close(self):
        self.stopped.set()
        if self.meter_thread.is_alive(): self.meter_thread.join(timeout=5)
