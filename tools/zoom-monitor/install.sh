#!/bin/bash
# Install an idle receiver; does not start EC2 or join a meeting.
set -euo pipefail
if [ "${1:-}" != --install ] || [ "$(id -u)" != 0 ]; then
  echo 'Usage: sudo bash install.sh --install' >&2
  exit 64
fi
source_dir=$(cd -- "$(dirname -- "$0")" && pwd)
target=/home/ubuntu/jupiter-zoom-monitor
install -d -o ubuntu -g ubuntu -m 0700 "$target"
for file in protocol.py gateway.py service.py requirements.txt; do
  install -o ubuntu -g ubuntu -m 0600 "$source_dir/$file" "$target/$file"
done
apt-get update -qq
apt-get install -y python3-venv libatomic1
if [ ! -x "$target/venv/bin/python" ]; then
  sudo -u ubuntu python3 -m venv "$target/venv"
fi
sudo -u ubuntu "$target/venv/bin/python" -m pip install --disable-pip-version-check -r "$target/requirements.txt"
"$target/venv/bin/python" -m playwright install-deps chromium
test -x /opt/jupiter-producer/browsers/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell
# Modify only the dispatch block, preserving the deployed bridge's other commands.
python3 - <<'PY'
from pathlib import Path
import os
path = Path('/home/ubuntu/jupiter-zoom/snapshot.py')
if path.is_symlink() or not path.is_file():
    raise SystemExit('Existing forced-command gateway is unavailable; no modification made')
text = path.read_text()
marker = "if os.environ.get('SSH_ORIGINAL_COMMAND', '').startswith('meeting-return '):"
if marker not in text:
    anchor = "if os.environ.get('SSH_ORIGINAL_COMMAND', '').startswith('satellite-stop '):"
    if text.count(anchor) != 1:
        raise SystemExit('Unrecognized existing gateway; no modification made')
    block = '''if os.environ.get('SSH_ORIGINAL_COMMAND', '').startswith('meeting-return '):
    import sys
    sys.path.insert(0, '/home/ubuntu/jupiter-zoom-monitor')
    from gateway import run
    try:
        run(os.environ['SSH_ORIGINAL_COMMAND'])
    except Exception:
        os.write(1, b'{"error":"Server monitor unavailable"}\\n')
        raise SystemExit(1)
    raise SystemExit(0)

'''
    backup = path.with_name('snapshot.py.before-server-monitor')
    if backup.exists() and backup.read_bytes() != path.read_bytes():
        raise SystemExit('Existing backup differs from gateway; inspect before retrying')
    if not backup.exists():
        backup.write_bytes(path.read_bytes())
        backup.chmod(0o600)
    updated = text.replace(anchor, block + anchor)
    compile(updated, str(path), 'exec')
    temporary = path.with_name('snapshot.py.monitor-install')
    temporary.write_text(updated)
    temporary.chmod(path.stat().st_mode & 0o777)
    os.chown(temporary, path.stat().st_uid, path.stat().st_gid)
    temporary.replace(path)
print('Forced-command dispatch verified; existing commands preserved')
PY
install -o root -g root -m 0644 "$source_dir/jupiter-zoom-monitor.service" /etc/systemd/system/jupiter-zoom-monitor.service
systemctl daemon-reload
systemctl enable --now jupiter-zoom-monitor.service
systemctl is-active --quiet jupiter-zoom-monitor.service
for attempt in $(seq 1 50); do
  if test -S /run/jupiter-zoom-monitor/control.sock; then break; fi
  sleep 0.1
done
test -S /run/jupiter-zoom-monitor/control.sock
printf 'Idle monitoring service installed. No meeting joined.\n'
