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

class StorageRecoveryTest(unittest.TestCase):
    def test_missing_ram_directory_is_recreated_without_losing_decoder_thread(self):
        import shutil
        with tempfile.TemporaryDirectory() as parent:
            root = Path(parent) / 'relay'
            root.mkdir()
            ingest = Ingest(root, {}, Path(parent))
            pixels = bytes([80]) * ingest.frame_bytes
            class VanishingDirectory(io.BytesIO):
                def read(self, size=-1):
                    if self.tell()==0 and root.exists(): shutil.rmtree(root)
                    return super().read(size)
            ingest.video(VanishingDirectory(pixels))
            self.assertEqual(ingest.frames, 1)
            self.assertEqual((root/'video.i420').stat().st_mode & 0o777, 0o600)
            self.assertEqual(root.stat().st_mode & 0o777, 0o700)
            self.assertFalse(list(root.glob('.frame-*')))

    def test_symlink_buffer_directory_is_rejected(self):
        with tempfile.TemporaryDirectory() as parent:
            root = Path(parent) / 'relay'
            root.symlink_to(parent)
            ingest = Ingest(root, {}, Path(parent))
            with self.assertRaises(RuntimeError): ingest.write_frame(bytes(ingest.frame_bytes))
