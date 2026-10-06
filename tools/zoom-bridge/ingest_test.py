import io
import tempfile
import unittest
from pathlib import Path
from srt_ingest import Ingest, HEADER, output_profile


class IngestTest(unittest.TestCase):
    def test_only_supported_profiles(self):
        self.assertEqual(output_profile({}), (1920, 1080, 15))
        self.assertEqual(output_profile({'width': 1280, 'height': 720}), (1280, 720, 15))
        for settings in ({'width': 1920, 'height': 720}, {'fps': 30}, {'width': 3840, 'height': 2160}):
            with self.assertRaises(ValueError): output_profile(settings)

    def test_complete_1080_frame_and_partial_tail(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            ingest = Ingest(root, {}, root)
            pixels = bytes([90]) * ingest.frame_bytes
            ingest.video(io.BytesIO(pixels + b'partial frame'))
            frame = (root / 'video.i420').read_bytes()
            header = HEADER.unpack(frame[:HEADER.size])
            self.assertEqual(header[1:3], (1920, 1080))
            self.assertEqual(header[4], 3110400)
            self.assertEqual(frame[HEADER.size:], pixels)
            self.assertEqual(ingest.frames, 1)
            self.assertEqual(ingest.status()['inputResolutions'], '1920x1080')
            self.assertEqual((root / 'video.i420').stat().st_mode & 0o777, 0o600)


if __name__ == '__main__': unittest.main()
