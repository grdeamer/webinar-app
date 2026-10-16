"""Independent worker heartbeat guard; never changes Zoom connection controls."""
import configparser
import io
import os
from pathlib import Path
import re
import signal
import threading
import time
import uuid

HEARTBEAT_TIMEOUT = 15
ACTIVE_STATES = {'starting', 'joined', 'waiting', 'waiting for host', 'reconnecting'}
STALL_ERROR = 'Worker stalled. No status update for over 15 seconds. Disconnect and reconnect this satellite.'
ROOM_ID = re.compile(r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}')


def is_stalled(status, modified, now=None):
    age = (time.time() if now is None else now) - modified
    return status in ACTIVE_STATES and (age > HEARTBEAT_TIMEOUT or age < -5)


def mark_stalled(path, now=None):
    """Replace only an unchanged stale snapshot, preserving its heartbeat time.

    A recovered worker overwrites this failed report on its next heartbeat.
    The controller still decides whether to connect or disconnect the worker.
    """
    path = Path(path)
    if path.is_symlink():
        return False
    cfg = configparser.ConfigParser(interpolation=None)
    cfg.optionxform = str
    try:
        with path.open() as source:
            metadata = os.fstat(source.fileno())
            cfg.read_file(source)
        status = cfg['worker']
        if not is_stalled(status.get('status', ''), metadata.st_mtime, now):
            return False
        status.update(status='failed', error=STALL_ERROR, camera='false', microphone='false', sourceVideo='false', sourceAudio='false', videoResolution='', shareSendFps='0')
        output = io.StringIO()
        cfg.write(output)
        temporary = path.with_name('.health-' + str(uuid.uuid4()) + '.tmp')
        try:
            with temporary.open('x') as target:
                os.chmod(temporary, 0o600)
                target.write(output.getvalue())
            # A controller poll is not a worker heartbeat. Keep the last real
            # worker-write time, including across repeated controller reports.
            os.utime(temporary, ns=(metadata.st_atime_ns, metadata.st_mtime_ns))
            current = path.stat()
            if (current.st_ino, current.st_mtime_ns) != (metadata.st_ino, metadata.st_mtime_ns):
                return False
            temporary.replace(path)
            return True
        finally:
            temporary.unlink(missing_ok=True)
    except (OSError, configparser.Error, KeyError):
        return False


def check_workers(rooms, now=None):
    for room in Path(rooms).iterdir():
        if room.is_symlink() or not ROOM_ID.fullmatch(room.name) or not room.is_dir():
            continue
        if mark_stalled(room / 'status.ini', now):
            print('Worker heartbeat stalled:', room.name, flush=True)


def main():
    stopped = threading.Event()
    for sig in (signal.SIGTERM, signal.SIGINT):
        signal.signal(sig, lambda *_: stopped.set())
    rooms = Path.home() / 'jupiter-zoom' / 'rooms'
    while not stopped.is_set():
        try:
            check_workers(rooms)
        except OSError:
            print('Worker heartbeat check unavailable', flush=True)
        stopped.wait(2)


if __name__ == '__main__':
    main()
