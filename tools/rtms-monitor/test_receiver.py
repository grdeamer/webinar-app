import asyncio
import base64
import hashlib
import hmac
import json
import time
import unittest
from protocol import MAX_SECONDS, media_handshake, picture, verify_webhook, zoom_socket
from service import Receiver

SESSION = '12345678-1234-1234-1234-123456789abc'
OTHER = '22345678-1234-1234-1234-123456789abc'
JPEG = b'\xff\xd8test\xff\xd9'


def signed(payload, event='meeting.rtms_started'):
    raw = json.dumps({'event': event, 'payload': payload})
    stamp = str(int(time.time()))
    signature = 'v0=' + hmac.new(b'webhook-secret', f'v0:{stamp}:{raw}'.encode(), hashlib.sha256).hexdigest()
    return {'action': 'event', 'raw': raw, 'timestamp': stamp, 'signature': signature}


class ProtocolTest(unittest.TestCase):
    def test_webhook_integrity_and_freshness(self):
        event = signed({'meeting_id': 1234567890})
        self.assertEqual(verify_webhook(event['raw'], event['timestamp'], event['signature'], 'webhook-secret')['event'], 'meeting.rtms_started')
        for raw, stamp, signature in [(event['raw'] + ' ', event['timestamp'], event['signature']), (event['raw'], '0', event['signature']), (event['raw'], event['timestamp'], 'v0=bad')]:
            with self.assertRaises(ValueError):
                verify_webhook(raw, stamp, signature, 'webhook-secret')

    def test_endpoint_allowlist(self):
        self.assertEqual(zoom_socket('srt://media.zoom.us,wss://media.zoom.us:443/path'), 'wss://media.zoom.us:443/path')
        for endpoint in ['ws://media.zoom.us', 'wss://media.zoom.us.evil.test', 'wss://127.0.0.1', 'wss://user:pass@media.zoom.us', 'wss://media.zoom.us:22', 'file:///etc/passwd']:
            with self.assertRaises(ValueError):
                zoom_socket(endpoint)

    def test_only_jpeg_and_requested_media(self):
        msg = {'msg_type': 15, 'content': {'data': base64.b64encode(JPEG).decode(), 'length': len(JPEG)}}
        self.assertEqual(picture(msg, 'video'), JPEG)
        self.assertIsNone(picture(msg, 'share'))
        msg['content']['length'] = 123
        with self.assertRaises(ValueError):
            picture(msg, 'video')
        self.assertEqual(media_handshake('u', 's', 'sig', 'share')['media_type'], 4)
        self.assertEqual(media_handshake('u', 's', 'sig', 'video')['media_params']['video']['codec'], 5)


class FakeSocket:
    def __init__(self, messages):
        self.messages = asyncio.Queue()
        for message in messages:
            self.messages.put_nowait(json.dumps(message))
        self.sent = []
        self.closed = False

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        self.closed = True

    async def send(self, raw):
        self.sent.append(json.loads(raw))

    async def recv(self):
        return await self.messages.get()


class ReceiverTest(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.now = 100.
        self.sockets = {}
        for kind in ['signal', 'video', 'share']:
            if kind == 'signal':
                messages = [{'msg_type': 2, 'status_code': 0, 'media_server': {'server_urls': {'video': 'wss://video.zoom.us', 'deskshare': 'wss://share.zoom.us'}}}, {'msg_type': 8, 'state': 1}]
            else:
                messages = [{'msg_type': 4, 'status_code': 0}, {'msg_type': 12, 'timestamp': 123}, {'msg_type': 15 if kind == 'video' else 16, 'content': {'data': base64.b64encode(JPEG).decode()}}]
            self.sockets[f'wss://{kind}.zoom.us'] = FakeSocket(messages)
        self.receiver = Receiver('client', 'secret', 'webhook-secret', lambda: self.now, self.sockets.__getitem__)
        await self.receiver.request({'action': 'arm', 'sessionId': SESSION, 'meetingId': '1234567890'})

    async def asyncTearDown(self):
        await self.receiver.stop()

    async def start_media(self):
        payload = {'meeting_id': 1234567890, 'meeting_uuid': 'uuid', 'rtms_stream_id': 'stream1', 'server_urls': 'wss://signal.zoom.us'}
        await self.receiver.request(signed(payload))
        for _ in range(20):
            await asyncio.sleep(0)
            if len(self.receiver.frames) == 2:
                break
        return payload

    async def test_two_media_handshakes_keepalives_and_cleanup(self):
        await self.start_media()
        self.assertEqual(self.receiver.state, 'receiving')
        self.assertEqual(set(self.receiver.frames), {'video', 'share'})
        for kind, expected in [('video', 2), ('share', 4)]:
            socket = self.sockets[f'wss://{kind}.zoom.us']
            self.assertEqual(socket.sent[0]['media_type'], expected)
            self.assertIn({'msg_type': 13, 'timestamp': 123}, socket.sent)
        await self.receiver.stop()
        self.assertFalse(self.receiver.frames)
        self.assertTrue(all(socket.closed for socket in self.sockets.values()))

    async def test_duplicate_event_does_not_start_again(self):
        payload = await self.start_media()
        task = self.receiver.task
        await self.receiver.request(signed(payload))
        self.assertIs(self.receiver.task, task)
        await self.receiver.request(signed({'meeting_uuid': 'uuid', 'rtms_stream_id': 'stream1'}, 'meeting.rtms_stopped'))
        self.assertEqual(self.receiver.state, 'ended')
        await self.receiver.request(signed(payload))
        self.assertIsNone(self.receiver.task)

    async def test_wrong_meeting_and_wrong_viewer_cannot_replace(self):
        self.assertFalse((await self.receiver.request(signed({'meeting_id': 9999999999, 'rtms_stream_id': 'x'})))[0]['accepted'])
        self.assertIsNone(self.receiver.task)
        status, _ = await self.receiver.request({'action': 'arm', 'sessionId': OTHER, 'meetingId': '9999999999'})
        self.assertIn('error', status)
        await self.receiver.request({'action': 'stop', 'sessionId': OTHER})
        self.assertEqual(self.receiver.state, 'waiting')

    async def test_stale_frames_and_hard_deadline(self):
        await self.start_media()
        self.now += 6
        _, frame = await self.receiver.request({'action': 'frame', 'sessionId': SESSION, 'kind': 'share'})
        self.assertFalse(frame)
        deadline = self.receiver.deadline
        await self.receiver.request({'action': 'arm', 'sessionId': SESSION, 'meetingId': '1234567890'})
        self.assertEqual(self.receiver.deadline, deadline)
        self.now += MAX_SECONDS
        self.assertFalse((await self.receiver.request(signed({'meeting_id': 1234567890, 'rtms_stream_id': 'late'})))[0]['accepted'])

    async def test_paused_stream_drops_media(self):
        await self.start_media()
        self.sockets['wss://signal.zoom.us'].messages.put_nowait(json.dumps({'msg_type': 8, 'state': 5}))
        for _ in range(20):
            await asyncio.sleep(0)
            if self.receiver.state == 'failed':
                break
        self.assertEqual(self.receiver.state, 'failed')
        self.assertFalse(self.receiver.frames)


if __name__ == '__main__':
    unittest.main()
