#!/bin/bash
set -euo pipefail
test "${1:-}" = --install && test "$(id -u)" = 0
case "${2:-}" in ""|--enable-on-boot) ;; *) exit 2 ;; esac
source_dir=$(cd -- "$(dirname -- "$0")" && pwd)
target=/home/ubuntu/jupiter-zoom-desktop
install -d -o ubuntu -g ubuntu -m 0700 "$target"
for file in protocol.py gateway.py service.py; do
  install -o ubuntu -g ubuntu -m 0600 "$source_dir/$file" "$target/$file"
done
apt-get update -qq
DEBIAN_FRONTEND=noninteractive apt-get install -y xvfb xauth x11-utils openbox x11vnc novnc websockify dbus-x11 pulseaudio pulseaudio-utils ffmpeg curl ca-certificates
if ! dpkg-query -W zoom >/dev/null 2>&1; then
  package=$(mktemp /tmp/jupiter-zoom-XXXXXX.deb)
  trap 'rm -f "$package"' EXIT
  curl --fail --location --proto '=https' --tlsv1.2 --max-time 120 https://zoom.us/client/latest/zoom_amd64.deb -o "$package"
  test "$(dpkg-deb -f "$package" Package)" = zoom
  DEBIAN_FRONTEND=noninteractive apt-get install -y "$package"
fi
test -x /usr/bin/zoom
python3 - <<'PY'
from pathlib import Path
import os
path = Path('/home/ubuntu/jupiter-zoom/snapshot.py')
if path.is_symlink() or not path.is_file():
    raise SystemExit('Gateway unavailable')
text = path.read_text()
marker = "if os.environ.get('SSH_ORIGINAL_COMMAND', '').startswith('desktop-return '):"
if marker not in text:
    anchor = "if os.environ.get('SSH_ORIGINAL_COMMAND', '').startswith('meeting-return '):"
    if text.count(anchor) != 1:
        raise SystemExit('Unrecognized gateway')
    block = '''if os.environ.get('SSH_ORIGINAL_COMMAND', '').startswith('desktop-return '):
    import subprocess
    import sys
    result = subprocess.run(['/usr/bin/python3', '/home/ubuntu/jupiter-zoom-desktop/gateway.py'], stdin=sys.stdin.buffer, stdout=sys.stdout.buffer, stderr=subprocess.DEVNULL, timeout=12)
    raise SystemExit(result.returncode)

'''
    backup = path.with_name('snapshot.py.before-desktop-monitor')
    if backup.exists() and backup.read_bytes() != path.read_bytes():
        raise SystemExit('Gateway backup differs')
    if not backup.exists():
        backup.write_bytes(path.read_bytes())
        backup.chmod(0o600)
    updated = text.replace(anchor, block + anchor)
    compile(updated, str(path), 'exec')
    temp = path.with_name('snapshot.py.desktop-install')
    temp.write_text(updated)
    temp.chmod(path.stat().st_mode & 0o777)
    os.chown(temp, path.stat().st_uid, path.stat().st_gid)
    temp.replace(path)
PY
install -m 0644 "$source_dir/jupiter-zoom-desktop.service" /etc/systemd/system/jupiter-zoom-desktop.service
systemctl daemon-reload
# Starting the unit only opens its private control socket. Zoom starts on an explicit room request.
if test "${2:-}" = --enable-on-boot; then
  systemctl enable jupiter-zoom-desktop.service
fi
systemctl start jupiter-zoom-desktop.service
systemctl is-active --quiet jupiter-zoom-desktop.service
printf 'Idle attended Zoom desktop service installed. No meeting joined.\n'
