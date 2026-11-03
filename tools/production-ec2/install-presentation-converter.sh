#!/bin/bash
set -euo pipefail
[[ $(id -u) -eq 0 && -f /etc/jupiter-producer-node ]] || exit 2
apt-get update -qq
DEBIAN_FRONTEND=noninteractive apt-get install -y -qq libreoffice-impress fonts-liberation
id jupiter-ppt >/dev/null 2>&1 || useradd --system --no-create-home --shell /usr/sbin/nologin jupiter-ppt
install -m 0755 tools/production-ec2/convert-presentation.sh /usr/local/sbin/jupiter-convert-presentation
printf '%s\n' 'd /run/jupiter-presentations 0700 jupiter-producer jupiter-producer -' > /etc/tmpfiles.d/jupiter-presentations.conf
systemd-tmpfiles --create /etc/tmpfiles.d/jupiter-presentations.conf

install -m 0755 tools/production-ec2/presentation-converter.py /usr/local/lib/jupiter-presentation-converter.py
install -m 0644 tools/production-ec2/jupiter-presentation-converter.{socket,service} /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now jupiter-presentation-converter.socket
