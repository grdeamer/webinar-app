import importlib.util
import io
import json
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
from container_worker import launch_container

class InputPipe(io.BytesIO):
    def close(self): self.payload = self.getvalue(); super().close()

class ContainerTest(unittest.TestCase):
    def test_runtime_secrets_only_use_stdin_and_mounts_are_narrow(self):
        rid = '367a8dc0-5027-4d8d-b16a-1f74d21cbeec'
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            pipe = InputPipe()
            child = SimpleNamespace(stdin=pipe, stdout=object())
            env = {'ZOOM_SDK_JWT':'test-jwt-secret', 'ZOOM_MEETING_ID':'123', 'ZOOM_MEETING_PASSCODE':'test-password', 'ZOOM_ROOM_ID':rid, 'UNRELATED_SECRET':'must-not-copy'}
            with patch('container_worker.subprocess.Popen', return_value=child) as spawn:
                _, name = launch_container(root, root/'room', rid, Path('/run/jupiter-io/test'), env)
            args = spawn.call_args.args[0]
            self.assertNotIn('test-jwt-secret', repr(args))
            self.assertNotIn('test-password', repr(args))
            self.assertNotIn('--privileged', args)
            self.assertIn('--cap-drop=all', args)
            self.assertIn('--log-driver=none', args)
            payload = json.loads(pipe.payload)
            self.assertEqual(payload['ZOOM_RELAY_ROOT'], '/relay')
            self.assertNotIn('UNRELATED_SECRET', payload)
            self.assertTrue(name.endswith(rid))

    def test_missing_feed_fails_before_launch(self):
        with patch('container_worker.subprocess.Popen') as spawn:
            with self.assertRaises(ValueError): launch_container(Path('/unused'), Path('/unused'), 'bad', None, {})
            spawn.assert_not_called()

    def test_bootstrap_rejects_unexpected_environment(self):
        spec = importlib.util.spec_from_file_location('bootstrap', Path(__file__).parent/'containers/bootstrap.py')
        module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
        with self.assertRaises(ValueError): module.validate({'LD_PRELOAD':'unsafe'})
        with self.assertRaises(ValueError): module.validate({'ZOOM_SDK_JWT':'bad\0value'})

if __name__ == '__main__': unittest.main()
