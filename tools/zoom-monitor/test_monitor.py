import asyncio
import io
import json
import time
import unittest
from unittest.mock import patch

from protocol import classify, join_target, parse_request
from service import Monitor
from gateway import read_exact

ONE = '11111111-1111-4111-8111-111111111111'
TWO = '22222222-2222-4222-8222-222222222222'
LINK = 'https://example.zoom.us/j/12345678901?pwd=fixture&zak=discarded'


class ProtocolTest(unittest.TestCase):
    def test_only_zoom_join_urls_and_passcode_are_forwarded(self):
        self.assertEqual(join_target(LINK), 'https://example.zoom.us/wc/join/12345678901?pwd=fixture')
        for value in ['http://zoom.us/j/12345678901', 'https://zoom.us.evil.test/j/12345678901',
                      'https://user:pass@zoom.us/j/12345678901', 'https://zoom.us:443/j/12345678901',
                      'https://zoom.us/start/12345678901', 'https://127.0.0.1/j/12345678901']:
            with self.assertRaises(ValueError): join_target(value)

    def test_commands_and_identities_are_strict(self):
        for value in [{'action': 'exec', 'sessionId': ONE}, {'action': 'stop', 'sessionId': ONE + ';id'},
                      {'action': 'start', 'sessionId': ONE, 'joinUrl': LINK, 'record': True},
                      {'action': 'status', 'sessionId': ONE, 'joinUrl': LINK}]:
            with self.assertRaises(ValueError): parse_request(value)

    def test_waiting_verification_and_terms_precede_connected(self):
        self.assertEqual(classify('Waiting room', True), 'waiting_room')
        self.assertEqual(classify('I agree', True), 'needs_attention')
        self.assertEqual(classify('CAPTCHA', False), 'needs_attention')
        self.assertEqual(classify('Sign in to join', True), 'needs_attention')
        self.assertEqual(classify('Waiting for the host', False), 'waiting_for_host')
        self.assertEqual(classify('Meeting has ended', True), 'ended')
        self.assertEqual(classify('participant view', True), 'connected')
        self.assertEqual(classify('participant view', False), 'joining')

    def test_truncated_frames_are_rejected(self):
        self.assertEqual(read_exact(io.BytesIO(b'123'), 3), b'123')
        with self.assertRaises(ValueError): read_exact(io.BytesIO(b'12'), 3)


class LifecycleTest(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.monitor = Monitor()
        self.joins = 0
        self.cleanups = 0
        async def fake_run(target):
            self.joins += 1
            try: await asyncio.Event().wait()
            finally: self.cleanups += 1
        self.monitor.run = fake_run

    async def asyncTearDown(self):
        await self.monitor.stop()

    async def start(self, identity=ONE):
        result = await self.monitor.request(parse_request({'action': 'start', 'sessionId': identity, 'joinUrl': LINK}))
        await asyncio.sleep(0)
        return result

    async def test_duplicate_start_does_not_rejoin_or_extend_deadline(self):
        await self.start()
        deadline = self.monitor.deadline
        await self.start()
        self.assertEqual(self.joins, 1)
        self.assertEqual(self.monitor.deadline, deadline)

    async def test_second_room_and_stale_stop_cannot_replace_active_monitor(self):
        await self.start()
        self.assertIn('error', await self.start(TWO))
        self.assertIn('error', await self.monitor.request({'action': 'stop', 'sessionId': TWO}))
        self.assertEqual(self.cleanups, 0)
        self.assertEqual(self.monitor.id, ONE)

    async def test_stop_retires_owned_task_and_all_media(self):
        await self.start()
        self.monitor.frame = b'fixture'
        self.monitor.frame_at = time.monotonic()
        await self.monitor.request({'action': 'stop', 'sessionId': ONE})
        self.assertEqual(self.cleanups, 1)
        self.assertIsNone(self.monitor.frame)
        self.assertIsNone(self.monitor.task)
        self.assertEqual(self.monitor.state, 'stopped')

    async def test_stale_frame_is_not_returned_and_view_does_not_extend_hard_deadline(self):
        await self.start()
        self.monitor.frame = b'fixture'
        self.monitor.frame_at = time.monotonic() - 6
        deadline = self.monitor.deadline
        result = await self.monitor.request({'action': 'frame', 'sessionId': ONE})
        self.assertIn('error', result)
        self.assertEqual(self.monitor.deadline, deadline)
        self.assertLessEqual(self.monitor.viewer_deadline, time.monotonic() + 30)


if __name__ == '__main__': unittest.main()
