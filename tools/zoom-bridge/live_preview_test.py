import struct
import tempfile
import time
import unittest
from pathlib import Path
from live_preview import fresh_frame, run

class LivePreviewTest(unittest.TestCase):
    def test_missing_stale_and_valid_frame(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.assertIsNone(fresh_frame(root))
            def write(age):
                (root/'video.i420').write_bytes(struct.pack('<8IQ', 0x4a494f31, 4, 2, 0, 12, 0, 0, 0, int(time.monotonic()*1000)-age)+bytes(12))
            write(3000)
            self.assertIsNone(fresh_frame(root))
            write(0)
            self.assertEqual(fresh_frame(root)[:2], (4, 2))
    def test_rejects_unbounded_lease(self):
        for value in (0, -1, 121, 100000):
            with self.assertRaises(ValueError): run(value)

if __name__ == '__main__': unittest.main()
