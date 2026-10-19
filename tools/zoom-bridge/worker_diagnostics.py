"""Bounded, private worker metadata and stdout retention; never logs launch env."""
import json
import os
import threading
import time
import uuid
from pathlib import Path

ATTEMPTS = 10
LOG_BYTES = 2 * 1024 * 1024
FILES = ('worker.log', 'worker.log.1', 'diagnostic-events.log', 'operation.ini', 'status.ini', 'attempt.json')

def prepare_attempt(home):
    home = Path(home)
    home.mkdir(mode=0o700, parents=True, exist_ok=True)
    home.chmod(0o700)
    history = home / 'attempts'
    history.mkdir(mode=0o700, exist_ok=True)
    history.chmod(0o700)
    existing = [home / name for name in FILES if (home / name).exists()]
    if existing:
        archive = history / (time.strftime('%Y%m%dT%H%M%SZ', time.gmtime()) + f'-{time.time_ns():020d}-' + uuid.uuid4().hex)
        archive.mkdir(mode=0o700)
        for path in existing:
            if path.is_symlink():
                raise RuntimeError('Diagnostic files must not be symlinks')
            path.chmod(0o600)
            path.replace(archive / path.name)
    archives = sorted(p for p in history.iterdir() if p.is_dir() and not p.is_symlink())
    for old in archives[:-ATTEMPTS]:
        # Only our fixed metadata filenames can be removed by retention.
        for name in FILES:
            (old / name).unlink(missing_ok=True)
        old.rmdir()
    path = home / 'attempt.json'
    with path.open('x') as output:
        path.chmod(0o600)
        json.dump({'started_unix': int(time.time()), 'attempt': uuid.uuid4().hex}, output)

class WorkerLog:
    """Drain a subprocess pipe into two capped files; avoid unbounded disk growth."""
    def __init__(self, stream, home, limit=LOG_BYTES):
        self.stream, self.home, self.limit = stream, Path(home), limit
        self.failed = False
        self.thread = threading.Thread(target=self._run, daemon=True, name='worker-log')
        self.thread.start()

    def _run(self):
        output = None
        try:
            while True:
                block = os.read(self.stream.fileno(), 16384)
                if not block:
                    break
                if self.failed:
                    continue  # Keep draining: a disk error must not block the SDK.
                try:
                    if output is None:
                        path = self.home / 'worker.log'
                        output = os.fdopen(os.open(path, os.O_WRONLY | os.O_CREAT | os.O_APPEND | os.O_NOFOLLOW, 0o600), 'ab', buffering=0)
                        os.chmod(path, 0o600)
                    if output.tell() + len(block) > self.limit:
                        output.close()
                        output = None
                        (self.home / 'worker.log').replace(self.home / 'worker.log.1')
                        path = self.home / 'worker.log'
                        output = os.fdopen(os.open(path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC | os.O_NOFOLLOW, 0o600), 'ab', buffering=0)
                    output.write(block)
                except OSError:
                    self.failed = True
                    if output is not None:
                        output.close()
                        output = None
        finally:
            if output is not None:
                output.close()
            self.stream.close()

    def finish(self):
        self.thread.join(timeout=3)
        if self.thread.is_alive():
            raise RuntimeError('Worker log pipe did not close')

def finish_attempt(item):
    if item.get('logger'):
        item['logger'].finish()
    path = item['home'] / 'attempt.json'
    try:
        record = json.loads(path.read_text())
        record.update(stopped_unix=int(time.time()), exit_code=item['proc'].returncode, log_write_failed=bool(item.get('logger') and item['logger'].failed))
        path.write_text(json.dumps(record))
        path.chmod(0o600)
    except (OSError, ValueError):
        pass
