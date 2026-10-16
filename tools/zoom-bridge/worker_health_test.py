import configparser
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import controller
from worker_health import check_workers, is_stalled, mark_stalled, STALL_ERROR

ONE = '11111111-1111-4111-8111-111111111111'


class WorkerHealthTest(unittest.TestCase):
    def status(self, directory, state='joined', stamp=100):
        path = Path(directory) / 'status.ini'
        path.write_text(f'[worker]\nstatus={state}\ncamera=true\nmicrophone=true\nsourceVideo=true\nshareSendFps=15\n')
        os.utime(path, (stamp, stamp))
        return path

    def test_fresh_and_terminal_reports_are_not_changed(self):
        with tempfile.TemporaryDirectory() as directory:
            path = self.status(directory)
            original = path.read_bytes()
            self.assertFalse(mark_stalled(path, now=110))
            self.assertEqual(path.read_bytes(), original)
            for state in ('stopped', 'failed', 'capacity'):
                path = self.status(directory, state)
                self.assertFalse(mark_stalled(path, now=200))

    def test_stall_cannot_keep_old_joined_picture_or_heartbeat(self):
        with tempfile.TemporaryDirectory() as directory:
            path = self.status(directory)
            self.assertTrue(mark_stalled(path, now=116))
            cfg = configparser.ConfigParser(); cfg.read(path)
            self.assertEqual(cfg['worker']['status'], 'failed')
            self.assertEqual(cfg['worker']['error'], STALL_ERROR)
            self.assertFalse(cfg['worker'].getboolean('camera'))
            self.assertFalse(cfg['worker'].getboolean('microphone'))
            self.assertEqual(path.stat().st_mtime, 100)
            self.assertEqual(path.stat().st_mode & 0o777, 0o600)
            self.assertFalse(mark_stalled(path, now=200))
            # The worker can recover by writing a new heartbeat; the guard
            # never changes its control.ini or connection command.
            self.status(directory, stamp=200)
            self.assertFalse(mark_stalled(path, now=201))

    def test_recovery_during_check_is_not_overwritten(self):
        with tempfile.TemporaryDirectory() as directory:
            path = self.status(directory)
            original_stat = Path.stat
            def updated_stat(candidate, *, follow_symlinks=True):
                if candidate == path and follow_symlinks:
                    self.status(directory, stamp=116)
                return original_stat(candidate, follow_symlinks=follow_symlinks)
            with patch.object(Path, 'stat', updated_stat):
                self.assertFalse(mark_stalled(path, now=116))
            self.assertIn('status=joined', path.read_text())
            self.assertFalse(list(Path(directory).glob('.health-*.tmp')))

    def test_guard_ignores_symlinks_and_unknown_directories(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            saved = root / ONE; saved.mkdir(); path = self.status(saved)
            ignored = root / 'unrelated'; ignored.mkdir(); untouched = self.status(ignored)
            (root / '22222222-2222-4222-8222-222222222222').symlink_to(ignored)
            check_workers(root, now=116)
            self.assertIn('status = failed', path.read_text())
            self.assertIn('status=joined', untouched.read_text())

    def test_controller_rejects_stale_worker_even_without_guard(self):
        with tempfile.TemporaryDirectory() as directory:
            self.status(directory)
            with patch('worker_health.time.time', return_value=116):
                report = controller.report(ONE, {'home':Path(directory)})
            self.assertEqual(report['status'], 'failed')
            self.assertFalse(report['camera'])
            self.assertEqual(report['error'], STALL_ERROR)

    def test_future_heartbeat_is_not_treated_as_healthy(self):
        self.assertTrue(is_stalled('joined', 200, now=100))
        self.assertFalse(is_stalled('joined', 104, now=100))


if __name__ == '__main__':
    unittest.main()
