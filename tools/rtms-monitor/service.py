#!/usr/bin/env python3
"""One armed meeting, two receive-only JPEG feeds, private Unix socket only."""
import asyncio
import contextlib
import json
import os
import signal
import time
from pathlib import Path
from protocol import MAX_REQUEST, MAX_SECONDS, identity, media_handshake, picture, stream_signature, verify_webhook, zoom_socket


class Receiver:
    def __init__(self, client_id, secret, webhook_secret, clock=time.monotonic, connector=None):
        self.client_id, self.secret, self.webhook_secret = client_id, secret, webhook_secret
        self.clock = clock
        self.connector = connector
        self.id = None
        self.meeting = None
        self.deadline = self.lease = 0
        self.state = 'stopped'
        self.frames = {}
        self.task = None
        self.stream_id = None
        self.seen = set()
        self.lock = asyncio.Lock()
        self.bytes = 0

    async def stop(self, state='stopped'):
        task, self.task = self.task, None
        if task:
            task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await task
        self.frames.clear()
        self.stream_id = None
        self.state = state

    def status(self):
        return {'state': self.state, 'remainingSeconds': max(0, int(self.deadline - self.clock())),
                'recording': False, 'audio': False}

    async def request(self, request):
        async with self.lock:
            if self.state in ('waiting', 'connecting', 'receiving') and self.clock() >= min(self.deadline, self.lease):
                await self.stop('expired')
            action = request.get('action')
            if action == 'event':
                return await self.event(request), b''
            session = identity(request.get('sessionId'))
            if action == 'arm':
                if self.id == session:
                    return self.status(), b''  # Never extend a hard deadline.
                if self.state in ('waiting', 'connecting', 'receiving'):
                    return {'error': 'A qualification session is already armed'}, b''
                meeting = request.get('meetingId')
                if not isinstance(meeting, str) or not meeting.isdigit() or not 9 <= len(meeting) <= 11:
                    raise ValueError('Invalid meeting')
                await self.stop()
                self.id, self.meeting = session, meeting
                self.deadline, self.lease = self.clock() + MAX_SECONDS, self.clock() + 30
                self.seen.clear()
                self.bytes = 0
                self.state = 'waiting'
            elif session != self.id:
                return {'state': 'stopped'}, b''
            elif action == 'stop':
                await self.stop()
            elif action == 'frame':
                self.lease = self.clock() + 30
                frame = self.frames.get(request.get('kind'))
                # A presentation that stops sending must never appear as live.
                if frame and self.clock() - frame[1] < 5 and self.state == 'receiving':
                    return {**self.status(), 'jpegBytes': len(frame[0])}, frame[0]
            else:
                raise ValueError('Invalid action')
            return self.status(), b''

    async def event(self, request):
        event = verify_webhook(request.get('raw'), request.get('timestamp'), request.get('signature'), self.webhook_secret)
        obj = event.get('payload', {})
        event_name = event.get('event')
        if self.clock() >= min(self.deadline, self.lease):
            return {'accepted': False}
        stream = obj.get('rtms_stream_id')
        if not isinstance(stream, str) or not 1 <= len(stream) <= 256:
            raise ValueError('Invalid stream')
        if event_name in ('meeting.rtms_stopped', 'meeting.rtms_interrupted'):
            if stream == self.stream_id:
                await self.stop('ended' if event_name.endswith('stopped') else 'interrupted')
            return {'accepted': True}
        if str(obj.get('meeting_id')) != self.meeting:
            return {'accepted': False}
        if event_name != 'meeting.rtms_started' or self.state not in ('waiting', 'connecting', 'receiving'):
            return {'accepted': False}
        if stream in self.seen:
            return {'accepted': True}
        if self.task or len(self.seen) >= 10:
            return {'accepted': False}  # No replacement, retry or silent new spend.
        meeting_uuid = obj.get('meeting_uuid')
        if not isinstance(meeting_uuid, str) or not 1 <= len(meeting_uuid) <= 256:
            raise ValueError('Invalid meeting identity')
        server = zoom_socket(obj.get('server_urls'))
        self.seen.add(stream)
        self.stream_id = stream
        self.state = 'connecting'
        self.task = asyncio.create_task(self.run(server, meeting_uuid, stream))
        return {'accepted': True}

    async def guard(self):
        while True:
            await asyncio.sleep(1)
            if self.id and self.state in ('waiting', 'connecting', 'receiving') and self.clock() >= min(self.deadline, self.lease):
                async with self.lock:
                    await self.stop('expired')

    def connect(self, url):
        if self.connector:
            return self.connector(url)
        from websockets.asyncio.client import connect
        return connect(url, max_size=1_000_000, max_queue=2, open_timeout=8, close_timeout=2, proxy=None)

    async def run(self, server, meeting_uuid, stream):
        signature = stream_signature(self.client_id, self.secret, meeting_uuid, stream)
        try:
            async with self.connect(server) as signaling:
                await signaling.send(json.dumps({'msg_type': 1, 'protocol_version': 2, 'sequence': 1,
                    'meeting_uuid': meeting_uuid, 'rtms_stream_id': stream, 'signature': signature, 'buffer_data': False}))
                response = await self.receive(signaling)
                if response.get('msg_type') != 2 or response.get('status_code') != 0 or response.get('payload_encrypted'):
                    raise ValueError('Signaling denied or unsupported encoding')
                servers = response.get('media_server', {}).get('server_urls', {})
                # Request only these two media types; never audio, transcript, chat or ALL.
                urls = [(kind, zoom_socket(servers.get(key))) for kind, key in [('video', 'video'), ('share', 'deskshare' if 'deskshare' in servers else 'share')]]
                try:
                    async with asyncio.TaskGroup() as group:
                        for kind, url in urls:
                            group.create_task(self.media(signaling, url, meeting_uuid, stream, signature, kind))
                        group.create_task(self.signals(signaling))
                finally:
                    with contextlib.suppress(Exception):
                        await signaling.send(json.dumps({'msg_type': 21, 'rtms_stream_id': stream}))
        except asyncio.CancelledError:
            raise
        except Exception:
            self.state = 'failed'
        finally:
            self.frames.clear()
            if self.state in ('receiving', 'connecting'):
                self.state = 'ended'

    async def receive(self, connection):
        while True:
            raw = await asyncio.wait_for(connection.recv(), 65)
            self.bytes += len(raw)
            if self.bytes > 250_000_000:
                raise ValueError('Qualification traffic cap reached')
            message = json.loads(raw)
            if not isinstance(message, dict):
                raise ValueError('Invalid protocol message')
            if message.get('msg_type') == 12:
                await connection.send(json.dumps({'msg_type': 13, 'timestamp': message.get('timestamp')}))
            else:
                return message

    async def signals(self, connection):
        while True:
            message = await self.receive(connection)
            # Fail closed on lifecycle changes; no automatic reconnection for this trial.
            if (message.get('msg_type') == 8 and message.get('state') not in (0, 1, 6)) or (message.get('msg_type') == 9 and message.get('state') not in (0, 1, 2, 4)) or message.get('msg_type') == 30:
                raise ValueError('Stream lifecycle changed')

    async def media(self, signaling, url, meeting_uuid, stream, signature, kind):
        async with self.connect(url) as connection:
            await connection.send(json.dumps(media_handshake(meeting_uuid, stream, signature, kind)))
            response = await self.receive(connection)
            if response.get('msg_type') != 4 or response.get('status_code') != 0 or response.get('payload_encrypted'):
                raise ValueError('Media handshake rejected')
            await signaling.send(json.dumps({'msg_type': 7, 'rtms_stream_id': stream}))
            while True:
                message = await self.receive(connection)
                frame = picture(message, kind)
                if frame:
                    self.frames[kind] = (frame, self.clock())
                    self.state = 'receiving'


async def main():
    os.umask(0o077)
    receiver = Receiver(os.environ['ZOOM_RTMS_CLIENT_ID'], os.environ['ZOOM_RTMS_CLIENT_SECRET'], os.environ['ZOOM_RTMS_WEBHOOK_SECRET'])
    path = Path('/run/jupiter-rtms-monitor/control.sock')
    path.parent.mkdir(mode=0o700, exist_ok=True)
    path.unlink(missing_ok=True)

    async def handle(reader, writer):
        try:
            raw = await asyncio.wait_for(reader.readline(), 5)
            if len(raw) > MAX_REQUEST:
                raise ValueError('Oversized request')
            result, frame = await receiver.request(json.loads(raw))
            writer.write(json.dumps(result).encode() + b'\n' + frame)
            await writer.drain()
        except Exception:
            writer.write(b'{"error":"RTMS receiver unavailable"}\n')
            with contextlib.suppress(Exception):
                await writer.drain()
        finally:
            writer.close()
            await writer.wait_closed()

    server = await asyncio.start_unix_server(handle, str(path), limit=MAX_REQUEST + 1)
    stopped = asyncio.Event()
    for signum in (signal.SIGTERM, signal.SIGINT):
        asyncio.get_running_loop().add_signal_handler(signum, stopped.set)
    guard = asyncio.create_task(receiver.guard())
    try:
        async with server:
            await stopped.wait()
    finally:
        guard.cancel()
        await receiver.stop()
        path.unlink(missing_ok=True)


if __name__ == '__main__':
    asyncio.run(main())
