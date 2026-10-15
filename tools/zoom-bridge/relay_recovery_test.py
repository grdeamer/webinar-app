import os
import shutil
import socket
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import controller

class RelayRecoveryTest(unittest.TestCase):
    def tearDown(self):
        controller.children.clear()
        controller.failures.clear()

    def test_deleted_directory_recovers_socket_and_failed_workers(self):
        with tempfile.TemporaryDirectory() as parent:
            root = Path(parent) / 'relay'
            controller.ensure_relay_root(root)
            with socket.socket(socket.AF_UNIX, socket.SOCK_DGRAM) as first:
                first.bind(str(root / 'satellite.sock'))
                shutil.rmtree(root)
                controller.children['satellite'] = {'proc': object()}
                controller.failures['satellite'] = {'status': 'failed'}
                with patch.object(controller, 'terminate') as terminate:
                    self.assertTrue(controller.recover_relay(root))
                    terminate.assert_called_once()
                self.assertFalse(controller.children)
                self.assertFalse(controller.failures)
                self.assertEqual(root.stat().st_mode & 0o777, 0o700)
                with socket.socket(socket.AF_UNIX, socket.SOCK_DGRAM) as restarted:
                    restarted.bind(str(root / 'satellite.sock'))
                self.assertFalse(controller.recover_relay(root))

    def test_symlink_substitution_is_rejected(self):
        with tempfile.TemporaryDirectory() as parent:
            root = Path(parent) / 'relay'
            root.symlink_to(parent)
            with self.assertRaises(RuntimeError): controller.ensure_relay_root(root)

if __name__ == '__main__': unittest.main()
