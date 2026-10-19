#!/bin/bash
# Run only on the explicitly provisioned EC2 replacement, after private config transfer.
set -eu
test -f /etc/jupiter-io-ec2-node
test_root=/home/ubuntu/jupiter-zoom
test -f "$test_root/controller.json"
test -f "$test_root/.env"
test -f "$test_root/runtime-image.tar"
test -f "$test_root/zoom-meeting-sdk-linux-7.2.1.5860.tar.xz"
sudo loginctl enable-linger ubuntu
sudo systemctl start user@1000.service
export XDG_RUNTIME_DIR=/run/user/1000
export DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/1000/bus
mkdir -p "$test_root/sdk" "$test_root/rooms" "$test_root/source"
# The official archive contains ARM and x86 builds. Select x86_64 explicitly.
tar -xJf "$test_root/zoom-meeting-sdk-linux-7.2.1.5860.tar.xz" --strip-components=2 -C "$test_root/sdk" zoom-sdk-linux-7.2.1.5860/x86_64
ln -sf libmeetingsdk.so "$test_root/sdk/libmeetingsdk.so.1"
podman load -i "$test_root/runtime-image.tar" >/dev/null
podman tag localhost/jupiter-satellite:live-test-20261019 localhost/jupiter-satellite:production-20261019
cp "$test_root/containers/bootstrap.py" "$test_root/container-bootstrap.py"
chmod 700 "$test_root" "$test_root/bridge-worker" "$test_root/rooms" "$test_root/source"
chmod 600 "$test_root/.env" "$test_root/controller.json" "$test_root/srt-settings.json"
sudo install -m 0644 "$test_root/jupiter-zoom-controller.service" "$test_root/jupiter-io-audio.service" "$test_root/jupiter-io-display.service" "$test_root/jupiter-io-worker-health.service" "$test_root/jupiter-io-idle-stop.service" /etc/systemd/system/
sudo install -d /etc/systemd/system/jupiter-zoom-controller.service.d
sudo tee /etc/systemd/system/jupiter-zoom-controller.service.d/ec2.conf >/dev/null <<'CONFIG'
[Unit]
After=user@1000.service
Requires=user@1000.service
[Service]
Environment=JUPITER_CONTAINER_WORKERS=1
Environment=JUPITER_FRAME_RATE=30
Environment=JUPITER_WORKER_CAPACITY=10
CONFIG
# Cutover removes this hold only after pending connections have been cleared.
sudo tee /etc/systemd/system/jupiter-zoom-controller.service.d/migration-hold.conf >/dev/null <<'HOLD'
[Service]
Environment=JUPITER_WORKERS_HOLD=1
HOLD
sudo systemctl daemon-reload
printf 'Installed with meeting joins held. Services are not enabled or started by this script.\n'
