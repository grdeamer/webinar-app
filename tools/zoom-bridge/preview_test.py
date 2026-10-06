import datetime
import struct
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from preview import Preview, decode_frame


class PreviewTest(unittest.TestCase):
    @patch('preview.time.monotonic', return_value=10)
    def test_rejects_stale_partial_and_future_frames(self, _clock):
        def raw(stamp, width=4):
            return struct.pack('<8IQ', 0x4a494f31, width, 2, 0, 12, 0, 0, 0, stamp) + bytes(12)
        self.assertIsNotNone(decode_frame(raw(9990)))
        self.assertIsNone(decode_frame(raw(7000)))
        self.assertIsNone(decode_frame(raw(11000)))
        self.assertIsNone(decode_frame(raw(9990)[:-1]))
        self.assertIsNone(decode_frame(raw(9990)[:20]))
        self.assertIsNone(decode_frame(raw(9990, 1922)))

    def test_lease_is_bounded_and_stopped_worker_removes_frame_directory(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            preview = Preview(root, {})
            until = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=1)
            room = {'id': 'test', 'running': True, 'previewUntil': until.isoformat()}
            expires = preview.request(room)
            self.assertLessEqual(expires - datetime.datetime.now().timestamp(), 45)
            self.assertEqual((root / 'preview-test').stat().st_mode & 0o777, 0o700)
            room['running'] = False
            self.assertEqual(preview.request(room), 0)
            self.assertFalse((root / 'preview-test').exists())


if __name__ == '__main__':
    unittest.main()
