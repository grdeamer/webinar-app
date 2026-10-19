import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import controller
from worker_diagnostics import ATTEMPTS, prepare_attempt, WorkerLog, finish_attempt

class DiagnosticsTest(unittest.TestCase):
    def test_reconnect_preserves_status_operation_and_logs(self):
        with tempfile.TemporaryDirectory() as directory:
            home = Path(directory)
            prepare_attempt(home)
            for name in ('worker.log', 'status.ini', 'operation.ini', 'diagnostic-events.log'):
                (home / name).write_text('previous evidence')
            prepare_attempt(home)
            previous = next((home / 'attempts').iterdir())
            for name in ('worker.log', 'status.ini', 'operation.ini', 'diagnostic-events.log'):
                self.assertEqual((previous / name).read_text(), 'previous evidence')
                self.assertEqual((previous / name).stat().st_mode & 0o777, 0o600)
            self.assertNotIn('meeting', (home / 'attempt.json').read_text())
            self.assertEqual(home.stat().st_mode & 0o777, 0o700)

    def test_join_hold_stops_before_credentials_or_process_launch(self):
        with patch.dict(os.environ, {'JUPITER_WORKERS_HOLD': '1'}), patch.object(controller, 'read_env') as credentials, patch.object(controller.subprocess, 'Popen') as process:
            with self.assertRaisesRegex(RuntimeError, 'paused'):
                controller.launch({})
            credentials.assert_not_called()
            process.assert_not_called()

    def test_single_room_exception_expires_and_keeps_source_blocked(self):
        rid = '367a8dc0-5027-4d8d-b16a-1f74d21cbeec'
        with patch.dict(os.environ, {'JUPITER_WORKERS_HOLD': '1', 'JUPITER_TEST_SATELLITE': rid, 'JUPITER_TEST_EXPIRES': '200'}), patch('controller.time.time', return_value=100):
            self.assertTrue(controller.worker_join_allowed(rid))
            self.assertFalse(controller.worker_join_allowed())
            self.assertFalse(controller.worker_join_allowed('c6b26152-235d-4a33-af1f-55d1e3146201'))
        with patch.dict(os.environ, {'JUPITER_WORKERS_HOLD': '1', 'JUPITER_TEST_SATELLITE': rid, 'JUPITER_TEST_EXPIRES': '99'}), patch('controller.time.time', return_value=100):
            self.assertFalse(controller.worker_join_allowed(rid))

    def test_two_room_exception_still_blocks_other_rooms_and_invalid_lists(self):
        one = 'c6b26152-235d-4a33-af1f-55d1e3146202'
        two = '367a8dc0-5027-4d8d-b16a-1f74d21cbeec'
        with patch.dict(os.environ, {'JUPITER_WORKERS_HOLD': '1', 'JUPITER_TEST_SATELLITES': one+','+two, 'JUPITER_TEST_EXPIRES': '200'}), patch('controller.time.time', return_value=100):
            self.assertTrue(controller.worker_join_allowed(one))
            self.assertTrue(controller.worker_join_allowed(two))
            self.assertFalse(controller.worker_join_allowed('c6b26152-235d-4a33-af1f-55d1e3146201'))
            self.assertFalse(controller.worker_join_allowed())
        with patch.dict(os.environ, {'JUPITER_WORKERS_HOLD': '1', 'JUPITER_TEST_SATELLITES': one+',invalid', 'JUPITER_TEST_EXPIRES': '200'}):
            self.assertFalse(controller.worker_join_allowed(one))

    def test_history_is_bounded(self):
        with tempfile.TemporaryDirectory() as directory:
            home = Path(directory)
            for attempt in range(ATTEMPTS + 5):
                (home / 'worker.log').write_text(str(attempt))
                prepare_attempt(home)
            archives = sorted((home / 'attempts').iterdir())
            self.assertEqual(len(archives), ATTEMPTS)
            self.assertEqual([int((archive / 'worker.log').read_text()) for archive in archives], list(range(5, ATTEMPTS + 5)))

    def test_output_is_drained_rotated_and_exit_saved(self):
        with tempfile.TemporaryDirectory() as directory:
            home = Path(directory)
            prepare_attempt(home)
            proc = subprocess.Popen([sys.executable, '-c', 'import os; [os.write(1,b"x"*8192) for _ in range(200)]'], stdout=subprocess.PIPE)
            logger = WorkerLog(proc.stdout, home, limit=32768)
            proc.wait(timeout=10)
            finish_attempt({'proc': proc, 'logger': logger, 'home': home})
            self.assertEqual(json.loads((home / 'attempt.json').read_text())['exit_code'], 0)
            for name in ('worker.log', 'worker.log.1'):
                self.assertLessEqual((home / name).stat().st_size, 32768)
                self.assertEqual((home / name).stat().st_mode & 0o777, 0o600)

    def test_disk_failure_does_not_block_worker_output(self):
        with tempfile.TemporaryDirectory() as directory:
            home = Path(directory)
            prepare_attempt(home)
            proc = subprocess.Popen([sys.executable, '-c', 'import os; [os.write(1,b"x"*8192) for _ in range(200)]'], stdout=subprocess.PIPE)
            with patch('worker_diagnostics.os.open', side_effect=OSError('disk unavailable')):
                logger = WorkerLog(proc.stdout, home)
                proc.wait(timeout=10)
                logger.finish()
            self.assertTrue(logger.failed)
            self.assertEqual(proc.returncode, 0)

    def test_symlink_evidence_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            home = Path(directory)
            (home / 'outside').write_text('untouched')
            (home / 'worker.log').symlink_to(home / 'outside')
            with self.assertRaises(RuntimeError): prepare_attempt(home)
            self.assertEqual((home / 'outside').read_text(), 'untouched')

if __name__ == '__main__': unittest.main()
