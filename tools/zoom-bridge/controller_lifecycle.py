"""Host-local process ownership and idle failure backoff; never browser-owned."""
import fcntl
import random
from pathlib import Path


def acquire_controller_lock(runtime):
    path = Path(runtime) / 'controller.lock'
    handle = path.open('a')
    try:
        fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        handle.close()
        raise RuntimeError('A controller already owns this host') from None
    return handle  # Keep open for the process lifetime; children must not inherit it.


def exchange_delay(failures, active, jitter=None):
    if active or failures == 0:
        return 2  # Existing active cadence and 60s outage cleanup are unchanged.
    maximum = min(30, 2 ** min(failures + 1, 5))
    return maximum * (0.8 + 0.2 * (random.random() if jitter is None else jitter))
