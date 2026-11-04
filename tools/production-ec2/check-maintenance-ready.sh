#!/bin/bash
set -euo pipefail
for unit in apt-daily.service apt-daily-upgrade.service; do
  result="$(systemctl show "$unit" --property=Result --value)"
  state="$(systemctl show "$unit" --property=ActiveState --value)"
  if [[ "$result" != success || "$state" != inactive ]]; then
    echo '{"event":"producer-maintenance-preflight","ready":false}'
    exit 1
  fi
done
echo '{"event":"producer-maintenance-preflight","ready":true}'
