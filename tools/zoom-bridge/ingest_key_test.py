import tempfile
import unittest
from pathlib import Path
from controller import atomic, validate_ingest_key

class IngestKeyTest(unittest.TestCase):
    def test_key_validation_and_private_atomic_replacement(self):
        key = {'revision': '7a6e8893-a6bd-423e-859f-123456789abc', 'passphrase': 'a1' * 24}
        revision, secret = validate_ingest_key(key)
        self.assertEqual(revision, key['revision'])
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'key'
            path.write_text('old')
            atomic(path, secret)
            self.assertEqual(path.read_text(), secret)
            self.assertEqual(path.stat().st_mode & 0o777, 0o600)
            self.assertFalse(path.with_suffix('.tmp').exists())
        for invalid in [None, {}, {**key, 'passphrase': 'bad&url=1'}, {**key, 'revision': 'invalid'}]:
            with self.assertRaises((ValueError, KeyError, TypeError)):
                validate_ingest_key(invalid)
