#!/bin/bash
# Installs an idle receiver. Does not start compute, join Zoom or arm media.
set -euo pipefail
if [ "${1:-}" != --install ] || [ "$(id -u)" != 0 ]; then
  echo 'Usage: sudo bash install.sh --install' >&2
  exit 64
fi
source_dir=$(cd -- "$(dirname -- "$0")" && pwd)
target=/home/ubuntu/jupiter-rtms-monitor
install -d -o ubuntu -g ubuntu -m 0700 "$target"
for file in protocol.py gateway.py service.py requirements.txt; do
  install -o ubuntu -g ubuntu -m 0600 "$source_dir/$file" "$target/$file"
done
# Credentials must already be provisioned privately; never supplied via argv.
test -f "$target/.env"
test "$(stat -c %a "$target/.env")" = 600
python3 -c 'import sys; assert sys.version_info >= (3, 11), "Python 3.11+ required"'
if [ ! -x "$target/venv/bin/python" ]; then
  sudo -u ubuntu python3 -m venv "$target/venv"
fi
sudo -u ubuntu "$target/venv/bin/python" -m pip install --disable-pip-version-check -r "$target/requirements.txt"
python3 - <<'PY'
from pathlib import Path
import os
path = Path('/home/ubuntu/jupiter-zoom/snapshot.py')
if path.is_symlink() or not path.is_file():
    raise SystemExit('Existing gateway unavailable')
text = path.read_text()
marker = "if os.environ.get('SSH_ORIGINAL_COMMAND', '').startswith('rtms-return '):"
if marker not in text:
    anchor = "if os.environ.get('SSH_ORIGINAL_COMMAND', '').startswith('meeting-return '):"
    if text.count(anchor) != 1:
        raise SystemExit('Unrecognized gateway; no changes made')
    block = '''if os.environ.get('SSH_ORIGINAL_COMMAND', '').startswith('rtms-return '):
    import subprocess
    import sys
    result = subprocess.run(['/home/ubuntu/jupiter-rtms-monitor/venv/bin/python', '/home/ubuntu/jupiter-rtms-monitor/gateway.py'], stdin=sys.stdin.buffer, stdout=sys.stdout.buffer, stderr=subprocess.DEVNULL, timeout=10)
    raise SystemExit(result.returncode)

'''
    backup = path.with_name('snapshot.py.before-rtms-monitor')
    if backup.exists() and backup.read_bytes() != path.read_bytes():
        raise SystemExit('Gateway backup differs; inspect before continuing')
    if not backup.exists():
        backup.write_bytes(path.read_bytes())
        backup.chmod(0o600)
    updated = text.replace(anchor, block + anchor)
    compile(updated, str(path), 'exec')
    temporary = path.with_name('snapshot.py.rtms-install')
    temporary.write_text(updated)
    temporary.chmod(path.stat().st_mode & 0o777)
    os.chown(temporary, path.stat().st_uid, path.stat().st_gid)
    temporary.replace(path)
PY
install -o root -g root -m 0644 "$source_dir/jupiter-rtms-monitor.service" /etc/systemd/system/jupiter-rtms-monitor.service
systemctl daemon-reload
systemctl enable --now jupiter-rtms-monitor.service
systemctl is-active --quiet jupiter-rtms-monitor.service
printf 'Idle RTMS receiver installed. No media session armed.\n'
