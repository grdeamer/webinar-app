#!/bin/bash
# Public, non-secret first-boot safety setup. No media worker starts here.
set -euo pipefail
umask 077
swapoff -a
ulimit -c 0
install -d -m 0700 /etc/jupiter-producer
install -d -m 0755 /etc/ssh/sshd_config.d /etc/systemd/coredump.conf.d
printf 'producer-only\n' > /etc/jupiter-producer-node
printf '[Coredump]\nStorage=none\nProcessSizeMax=0\n' > /etc/systemd/coredump.conf.d/jupiter-producer.conf
printf 'PasswordAuthentication no\nKbdInteractiveAuthentication no\nPermitRootLogin no\n' > /etc/ssh/sshd_config.d/20-jupiter-producer.conf
systemctl reload ssh
cat > /etc/systemd/system/jupiter-producer-setup-stop.service <<'STOP'
[Unit]
Description=Non-extendable initial producer setup stop
[Service]
Type=oneshot
ExecStart=/sbin/shutdown -h now
STOP
cat > /etc/systemd/system/jupiter-producer-setup-stop.timer <<'TIMER'
[Unit]
Description=Guest backup shutdown for initial producer setup
[Timer]
OnBootSec=110min
AccuracySec=1s
Unit=jupiter-producer-setup-stop.service
[Install]
WantedBy=timers.target
TIMER
systemctl daemon-reload
systemctl enable --now jupiter-producer-setup-stop.timer
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:3072 -out /etc/jupiter-producer/bootstrap-key.pem 2>/dev/null
openssl pkey -in /etc/jupiter-producer/bootstrap-key.pem -pubout -out /etc/jupiter-producer/bootstrap-public.pem
chmod 600 /etc/jupiter-producer/bootstrap-key.pem
