#!/usr/bin/env python3
"""Private, receive-only desktop qualification. No automatic joins or retries."""
import asyncio
from collections import deque
import contextlib
import json
import os
from pathlib import Path
import secrets
import shutil
import signal
import time
from protocol import AUDIO_CHUNK, MAX_FRAME, MAX_SECONDS, parse_request

ROOT = Path('/run/jupiter-zoom-desktop')


def network_total():
    return sum(int(v[0]) + int(v[8]) for name, raw in
               (line.split(':', 1) for line in Path('/proc/net/dev').read_text().splitlines()[2:])
               if name.strip() != 'lo' for v in [raw.split()])


class Desktop:
    def __init__(self, clock=time.monotonic):
        self.clock = clock
        self.id = None
        self.meeting = None
        self.state = 'stopped'
        self.deadline = self.lease = 0
        self.children = []
        self.home = None
        self.env = None
        self.frame = None
        self.frame_at = 0
        self.audio = deque(maxlen=4)
        self.audio_task = None
        self.traffic = 0
        self.lock = asyncio.Lock()

    def status(self):
        return {'sessionId': self.id, 'meetingId': self.meeting, 'state': self.state,
                'remainingSeconds': max(0, int(self.deadline - self.clock())),
                'recording': False, 'audio': self.audio_task is not None and not self.audio_task.done()}

    async def spawn(self, args, input=None):
        process = await asyncio.create_subprocess_exec(*args, env=self.env, cwd=self.home,
            stdin=asyncio.subprocess.PIPE if input is not None else asyncio.subprocess.DEVNULL,
            stdout=asyncio.subprocess.DEVNULL, stderr=asyncio.subprocess.DEVNULL,
            start_new_session=True)
        self.children.append(process)
        if input is not None:
            await asyncio.wait_for(process.communicate(input), 3)
            self.children.remove(process)
            if process.returncode:
                raise RuntimeError('Desktop setup failed')
        return process

    async def collect_audio(self, reader):
        index = 0
        try:
            while True:
                data = await reader.readexactly(AUDIO_CHUNK)
                index += 1
                self.audio.append((index, data))
        except asyncio.IncompleteReadError:
            self.audio.clear()

    async def stop(self, state='stopped'):
        if self.audio_task:
            self.audio_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self.audio_task
            self.audio_task = None
        self.audio.clear()
        self.frame = None
        self.frame_at = 0
        for process in reversed(self.children):
            with contextlib.suppress(ProcessLookupError):
                os.killpg(process.pid, signal.SIGTERM)
        for process in reversed(self.children):
            try:
                await asyncio.wait_for(process.wait(), 2)
            except asyncio.TimeoutError:
                with contextlib.suppress(ProcessLookupError):
                    os.killpg(process.pid, signal.SIGKILL)
                await process.wait()
        self.children.clear()
        if self.home:
            shutil.rmtree(self.home, ignore_errors=True)
        (ROOT / 'vnc-password').unlink(missing_ok=True)
        self.state = state

    async def start(self, request):
        if request['sessionId'] == self.id:
            return  # No renewal or rejoin for the same session identity.
        if self.children:
            raise ValueError('Another desktop is active')
        await self.stop()
        self.id, self.meeting = request['sessionId'], request['meetingId']
        self.deadline, self.lease = self.clock() + MAX_SECONDS, self.clock() + 30
        self.traffic = network_total()
        self.state = 'starting'
        self.home = ROOT / ('session-' + self.id)
        self.home.mkdir(mode=0o700)
        for name in ('config', 'cache', 'xdg', 'tmp'):
            (self.home / name).mkdir(mode=0o700)
        auth = str(self.home / 'Xauthority')
        self.env = {**os.environ, 'HOME': str(self.home), 'XDG_CONFIG_HOME': str(self.home / 'config'),
            'XDG_CACHE_HOME': str(self.home / 'cache'), 'XDG_RUNTIME_DIR': str(self.home / 'xdg'),
            'TMPDIR': str(self.home / 'tmp'), 'DISPLAY': ':108', 'XAUTHORITY': auth,
            'QT_QPA_PLATFORM': 'xcb', 'QT_X11_NO_MITSHM': '1', 'LIBGL_ALWAYS_SOFTWARE': '1',
            'PULSE_SERVER': 'unix:' + str(self.home / 'pulse.sock'), 'PULSE_SOURCE': 'disabled_mic', 'PULSE_SINK': 'disabled_output',
            'DBUS_SESSION_BUS_ADDRESS': 'unix:path=' + str(self.home / 'bus')}
        try:
            await self.spawn(['xauth', '-f', auth, 'source', '-'],
                             f'add :108 . {secrets.token_hex(16)}\n'.encode())
            await self.spawn(['Xvfb', ':108', '-screen', '0', '1280x720x24', '-nolisten', 'tcp', '-auth', auth, '-noreset'])
            await self.spawn(['dbus-daemon', '--session', '--nofork', '--address=' + self.env['DBUS_SESSION_BUS_ADDRESS']])
            await asyncio.sleep(1)
            await self.spawn(['openbox', '--sm-disable'])
            await self.spawn(['pulseaudio', '--daemonize=no', '--exit-idle-time=-1', '--use-pid-file=no', '-n',
                '--load=module-native-protocol-unix socket=' + str(self.home / 'pulse.sock'),
                '--load=module-null-sink sink_name=disabled_output',
                '--load=module-null-source source_name=disabled_mic',
                '--load=module-always-sink'])
            await asyncio.sleep(1)
            await self.spawn(['pactl', 'set-source-mute', 'disabled_mic', '1'], b'')
            password = secrets.token_urlsafe(24)
            (ROOT / 'vnc-password').write_text(password + '\n')
            (ROOT / 'vnc-password').chmod(0o600)
            await self.spawn(['x11vnc', '-display', ':108', '-auth', auth, '-localhost', '-rfbport', '5908',
                '-passwdfile', str(ROOT / 'vnc-password'), '-forever', '-shared', '-quiet', '-noxdamage'])
            await self.spawn(['websockify', '--web=/usr/share/novnc', '127.0.0.1:6088', '127.0.0.1:5908'])
            # Launch an ordinary Zoom desktop. Join/admission/terms/layout happen
            # through the attended console; no web-bot detection is bypassed.
            await self.spawn(['/usr/bin/zoom'])
            capture = await asyncio.create_subprocess_exec(
                'ffmpeg', '-v', 'error', '-nostdin', '-f', 'pulse', '-i', 'disabled_output.monitor',
                '-ac', '1', '-ar', '24000', '-f', 's16le', '-flush_packets', '1', 'pipe:1',
                env=self.env, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.DEVNULL,
                start_new_session=True)
            self.children.append(capture)
            self.audio_task = asyncio.create_task(self.collect_audio(capture.stdout))
            self.state = 'desktop_ready'
        except BaseException:
            await self.stop('failed')
            raise

    async def request(self, request):
        async with self.lock:
            if self.state in ('starting', 'desktop_ready'):
                total = network_total() - self.traffic
                if self.clock() >= min(self.deadline, self.lease) or not 0 <= total <= 1_500_000_000:
                    await self.stop('expired')
            action = request['action']
            if action == 'status':
                return self.status(), b''
            if action == 'start':
                await self.start(request)
            elif request['sessionId'] != self.id:
                return {'error': 'Desktop session unavailable'}, b''
            elif action == 'stop':
                await self.stop()
            elif action == 'audio' and self.state == 'desktop_ready':
                self.lease = self.clock() + 30
                chunks = [item for item in self.audio if item[0] > request['after']]
                if chunks:
                    data = b''.join(chunk for _, chunk in chunks)
                    return {**self.status(), 'audioBytes': len(data), 'audioSequence': chunks[-1][0]}, data
            elif action == 'frame' and self.state == 'desktop_ready':
                self.lease = self.clock() + 30
                if self.frame is None or self.clock() - self.frame_at >= 1:
                    process = await asyncio.create_subprocess_exec('ffmpeg', '-v', 'error', '-nostdin',
                        '-threads', '1', '-f', 'x11grab', '-draw_mouse', '0', '-video_size', '1280x720',
                        '-framerate', '1', '-i', ':108', '-frames:v', '1', '-threads', '1',
                        '-f', 'image2pipe', '-c:v', 'mjpeg', '-q:v', '6', 'pipe:1', env=self.env,
                        stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.DEVNULL)
                    try:
                        data, _ = await asyncio.wait_for(process.communicate(), 4)
                    finally:
                        if process.returncode is None:
                            process.kill()
                            await process.wait()
                    if process.returncode or not 4 <= len(data) <= MAX_FRAME or not (data.startswith(b'\xff\xd8') and data.endswith(b'\xff\xd9')):
                        self.frame = None
                        raise ValueError('No fresh desktop image')
                    self.frame, self.frame_at = data, self.clock()
                return {**self.status(), 'jpegBytes': len(self.frame)}, self.frame
            return self.status(), b''


async def main():
    os.umask(0o077)
    ROOT.mkdir(mode=0o700, exist_ok=True)
    socket = ROOT / 'control.sock'
    socket.unlink(missing_ok=True)
    desktop = Desktop()
    stopped = asyncio.Event()

    async def client(reader, writer):
        try:
            raw = await asyncio.wait_for(reader.readline(), 5)
            if len(raw) > 4096 or not raw.endswith(b'\n'):
                raise ValueError('Invalid request')
            status, frame = await desktop.request(parse_request(json.loads(raw)))
            writer.write(json.dumps(status).encode() + b'\n' + frame)
            await asyncio.wait_for(writer.drain(), 5)
        except Exception:
            writer.write(b'{"error":"Desktop unavailable"}\n')
            with contextlib.suppress(Exception):
                await writer.drain()
        finally:
            writer.close()
            with contextlib.suppress(Exception):
                await writer.wait_closed()
            if desktop.id is not None and desktop.state in ('stopped', 'failed', 'expired'):
                # End the unit after the response. systemd KillMode=control-group
                # also reaps vendor subprocesses that may have changed sessions.
                stopped.set()

    async def guard():
        while True:
            await asyncio.sleep(1)
            await desktop.request({'action': 'status'})
            if desktop.id is not None and desktop.state in ('stopped', 'failed', 'expired'):
                stopped.set()
                return

    server = await asyncio.start_unix_server(client, str(socket), limit=8192)
    for signum in (signal.SIGINT, signal.SIGTERM):
        asyncio.get_running_loop().add_signal_handler(signum, stopped.set)
    guard_task = asyncio.create_task(guard())
    try:
        async with server:
            await stopped.wait()
    finally:
        guard_task.cancel()
        await desktop.stop()
        socket.unlink(missing_ok=True)


if __name__ == '__main__':
    asyncio.run(main())
