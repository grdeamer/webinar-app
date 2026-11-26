import asyncio
from pathlib import Path
import tempfile
import unittest
from unittest.mock import AsyncMock, patch
from protocol import AUDIO_CHUNK, parse_request
from service import Desktop

ID = '12345678-1234-1234-1234-123456789abc'
NEXT_ID = '98765432-1234-1234-1234-123456789abc'


class ProtocolTests(unittest.TestCase):
    def test_start_discards_embedded_credentials(self):
        result = parse_request({'action': 'start', 'sessionId': ID,
            'joinUrl': 'https://example.zoom.us/j/12345678901?pwd=private'})
        self.assertEqual(result, {'action': 'start', 'sessionId': ID, 'meetingId': '12345678901'})

    def test_rejects_untrusted_targets_and_extra_fields(self):
        for link in ['http://zoom.us/j/12345678901', 'https://zoom.us.evil.test/j/12345678901',
                     'https://user@zoom.us/j/12345678901', 'https://zoom.us:444/j/12345678901']:
            with self.assertRaises(ValueError):
                parse_request({'action': 'start', 'sessionId': ID, 'joinUrl': link})
        with self.assertRaises(ValueError):
            parse_request({'action': 'status', 'sessionId': ID})


class LifecycleTests(unittest.IsolatedAsyncioTestCase):
    async def test_viewer_lease_expires_without_persisted_media(self):
        clock = [10]
        desktop = Desktop(clock=lambda: clock[0])
        desktop.id, desktop.state = ID, 'desktop_ready'
        desktop.deadline, desktop.lease, desktop.traffic = 100, 20, 0
        desktop.frame = b'old-frame'
        with tempfile.TemporaryDirectory() as directory, patch('service.ROOT', Path(directory)), patch('service.network_total', return_value=0):
            clock[0] = 21
            result, frame = await desktop.request({'action': 'status'})
        self.assertEqual(result['state'], 'expired')
        self.assertIsNone(desktop.frame)
        self.assertEqual(frame, b'')

    async def test_audio_cursor_returns_new_chunks_and_renews_receiver_lease(self):
        desktop = Desktop(clock=lambda: 10)
        desktop.id, desktop.state = ID, 'desktop_ready'
        desktop.deadline, desktop.lease = 100, 15
        reader = asyncio.StreamReader()
        for index in range(1, 7):
            reader.feed_data(bytes([index]) * AUDIO_CHUNK)
        collection = asyncio.create_task(desktop.collect_audio(reader))
        try:
            await asyncio.sleep(0)
            self.assertEqual([index for index, _ in desktop.audio], [3, 4, 5, 6])
            with patch('service.network_total', return_value=0):
                status, pcm = await desktop.request({'action': 'audio', 'sessionId': ID, 'after': 4})
                rejected, unavailable = await desktop.request({'action': 'audio', 'sessionId': 'other', 'after': 0})
            self.assertEqual(status['audioSequence'], 6)
            self.assertEqual(pcm, bytes([5]) * AUDIO_CHUNK + bytes([6]) * AUDIO_CHUNK)
            self.assertEqual(desktop.lease, 40)
            self.assertIn('error', rejected)
            self.assertEqual(unavailable, b'')
        finally:
            collection.cancel()
            await asyncio.gather(collection, return_exceptions=True)

    async def test_wrong_viewer_cannot_stop_active_session(self):
        desktop = Desktop(clock=lambda: 10)
        desktop.id, desktop.state = ID, 'desktop_ready'
        desktop.deadline, desktop.lease, desktop.traffic = 100, 50, 0
        with patch('service.network_total', return_value=0):
            result, _ = await desktop.request({'action': 'stop', 'sessionId': 'other'})
        self.assertIn('error', result)
        self.assertEqual(desktop.state, 'desktop_ready')

    async def test_disconnect_clears_media_and_keeps_the_existing_deadline(self):
        desktop = Desktop(clock=lambda: 10)
        desktop.id, desktop.state = ID, 'desktop_ready'
        desktop.deadline, desktop.lease = 100, 40
        desktop.frame = b'old-frame'
        desktop.audio.append((1, b'old-audio'))
        with tempfile.TemporaryDirectory() as directory, patch('service.ROOT', Path(directory)), patch('service.network_total', return_value=0):
            result, _ = await desktop.request({'action': 'disconnect', 'sessionId': ID})
        self.assertEqual(result['state'], 'idle')
        self.assertEqual(desktop.deadline, 100)
        self.assertIsNone(desktop.frame)
        self.assertFalse(desktop.audio)

    async def test_replace_is_scoped_to_the_current_session(self):
        desktop = Desktop(clock=lambda: 10)
        desktop.id, desktop.state = ID, 'desktop_ready'
        desktop.deadline, desktop.lease = 100, 40
        with tempfile.TemporaryDirectory() as directory, patch('service.ROOT', Path(directory)), patch('service.network_total', return_value=0), patch.object(desktop, 'start', new_callable=AsyncMock) as start:
            request = {'action': 'replace', 'sessionId': 'other', 'nextSessionId': NEXT_ID, 'meetingId': '12345678901'}
            denied, _ = await desktop.request(request)
            self.assertIn('error', denied)
            start.assert_not_awaited()
            await desktop.request({**request, 'sessionId': ID})
            start.assert_awaited_once_with({'sessionId': NEXT_ID, 'meetingId': '12345678901'})
        self.assertEqual(desktop.deadline, 100)

    async def test_same_start_does_not_extend_deadline(self):
        desktop = Desktop(clock=lambda: 10)
        desktop.id, desktop.deadline = ID, 99
        await desktop.start({'sessionId': ID, 'meetingId': '12345678901'})
        self.assertEqual(desktop.deadline, 99)


if __name__ == '__main__':
    unittest.main()
