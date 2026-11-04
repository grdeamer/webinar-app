#!/bin/bash
set -euo pipefail
[[ $EUID == 0 && -f /etc/jupiter-producer-node ]] || exit 1
source_dir="${1:?Reviewed source directory required}"
[[ -f "$source_dir/jupiter-producer-maintenance.service" && -f "$source_dir/check-maintenance-ready.sh" ]] || exit 1
# No credentials, recording configuration or network permissions are changed.
systemctl stop jupiter-producer.service jupiter-livekit.service
install -m 0755 "$source_dir/check-maintenance-ready.sh" /opt/jupiter-producer/check-maintenance-ready.sh
install -m 0644 "$source_dir/jupiter-producer-maintenance.service" /etc/systemd/system/jupiter-producer-maintenance.service
for unit in jupiter-producer jupiter-livekit; do
 install -d -m 0755 "/etc/systemd/system/$unit.service.d"
 install -m 0644 "$source_dir/55-maintenance-preflight.conf" "/etc/systemd/system/$unit.service.d/55-maintenance-preflight.conf"
done
systemctl daemon-reload
systemd-analyze verify /etc/systemd/system/jupiter-producer-maintenance.service /etc/systemd/system/jupiter-producer.service /etc/systemd/system/jupiter-livekit.service
printf '%s\n' '{"event":"producer-resilience-installed","workersStarted":false}'
