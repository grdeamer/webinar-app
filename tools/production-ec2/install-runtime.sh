#!/bin/bash
# Run only on the newly approved producer node with independent setup stop armed.
set -euo pipefail
umask 077
[[ -f /etc/jupiter-producer-node ]] || { echo 'Not a marked producer node'; exit 2; }
[[ $(id -u) -eq 0 ]] || exit 2
swapoff -a
ulimit -c 0
install -d -m 0755 /opt/jupiter-producer /etc/systemd/coredump.conf.d
printf '[Coredump]\nStorage=none\nProcessSizeMax=0\n' > /etc/systemd/coredump.conf.d/jupiter-producer.conf
apt-get update -qq
DEBIAN_FRONTEND=noninteractive apt-get install -y -qq ca-certificates curl xz-utils caddy
node_version=v24.19.0
archive="node-${node_version}-linux-x64.tar.xz"
task_tmp=$(mktemp -d /run/jupiter-node-install-XXXXXX)
trap 'rm -rf "$task_tmp"' EXIT
curl -fsS --retry 2 "https://nodejs.org/dist/${node_version}/${archive}" -o "$task_tmp/$archive"
curl -fsS --retry 2 "https://nodejs.org/dist/${node_version}/SHASUMS256.txt" -o "$task_tmp/SHASUMS256.txt"
(cd "$task_tmp"; awk -v name="$archive" '$2==name {print}' SHASUMS256.txt > expected.sha256; test -s expected.sha256; sha256sum -c expected.sha256)
tar -xJf "$task_tmp/$archive" -C /usr/local --strip-components=1
node --version
id jupiter-producer >/dev/null 2>&1 || useradd --system --no-create-home --shell /usr/sbin/nologin jupiter-producer
cd /opt/jupiter-producer
# Source bundle and package manifest were uploaded before this script. No private env is output.
npm ci --ignore-scripts --no-audit --no-fund
PLAYWRIGHT_BROWSERS_PATH=/opt/jupiter-producer/browsers npx playwright-core install --with-deps chromium
chmod -R a+rX /opt/jupiter-producer
install -m 0755 tools/production-ec2/start-engine.sh /opt/jupiter-producer/start-engine.sh
install -m 0644 tools/production-ec2/jupiter-producer.service /etc/systemd/system/
install -m 0644 tools/production-ec2/jupiter-producer-boot-stop.service /etc/systemd/system/
install -m 0644 tools/production-ec2/jupiter-producer-boot-stop.timer /etc/systemd/system/
systemctl daemon-reload
# Do not start a compositor until secrets and scope have been privately installed.
systemctl enable jupiter-producer.service jupiter-producer-boot-stop.timer
printf 'Runtime installed; engine remains unstarted pending private configuration\n'
