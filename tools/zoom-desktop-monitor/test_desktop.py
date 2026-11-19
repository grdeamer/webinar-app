import asyncio
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from protocol import parse_request
from service import Desktop

ID = '12345678-1234-1234-1234-123456789abc'


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

    async def test_wrong_viewer_cannot_stop_active_session(self):
        desktop = Desktop(clock=lambda: 10)
        desktop.id, desktop.state = ID, 'desktop_ready'
        desktop.deadline, desktop.lease, desktop.traffic = 100, 50, 0
        with patch('service.network_total', return_value=0):
            result, _ = await desktop.request({'action': 'stop', 'sessionId': 'other'})
        self.assertIn('error', result)
        self.assertEqual(desktop.state, 'desktop_ready')

    async def test_same_start_does_not_extend_deadline(self):
        desktop = Desktop(clock=lambda: 10)
        desktop.id, desktop.deadline = ID, 99
        await desktop.start({'sessionId': ID, 'meetingId': '12345678901'})
        self.assertEqual(desktop.deadline, 99)


if __name__ == '__main__':
    unittest.main()
