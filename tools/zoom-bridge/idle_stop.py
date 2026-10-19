"""EC2 idle stop. Reads numeric RAM status only; never records program media."""
import json
import subprocess
import time
from pathlib import Path

IDLE_SECONDS = 15 * 60

def active_feed(runtime=Path('/run/jupiter-io'), now=None):
    now = time.time() if now is None else now
    for path in runtime.glob('jupiter-io-*/runtime-status.json'):
        try:
            state = json.loads(path.read_text())
            age = now - float(state['updatedAt'])
            if 0 <= age < 15 and (state.get('sourceActive') is True or int(state.get('satellites', 0)) > 0):
                return True
        except (OSError, ValueError, KeyError, TypeError):
            pass
    return False

def main():
    idle_since = time.monotonic()
    while True:
        if active_feed(): idle_since = time.monotonic()
        if time.monotonic() - idle_since >= IDLE_SECONDS:
            subprocess.run(['/usr/bin/systemctl', 'poweroff'], check=True)
            return
        time.sleep(10)

if __name__ == '__main__': main()
