#!/bin/bash
set -euo pipefail
[[ $# -eq 2 && "$1" =~ ^deck-[a-zA-Z0-9_]{8}$ && "$2" =~ ^(ppt|pptx)$ ]] || exit 2
job="/run/jupiter-converter/$1"
[[ -d "$job" && ! -L "$job" && -f "$job/input.$2" && ! -L "$job/input.$2" ]] || exit 2
# Source jobs are created only by the producer user in a protected parent directory.
chown -R jupiter-ppt:jupiter-ppt "$job"
chmod 0700 "$job"

mkdir -p "$job/profile/user"
printf '%s' '<?xml version="1.0"?><oor:items xmlns:oor="http://openoffice.org/2001/registry"><item oor:path="/org.openoffice.Office.Common/Security/Scripting"><prop oor:name="MacroSecurityLevel" oor:op="fuse"><value>3</value></prop></item></oor:items>' > "$job/profile/user/registrymodifications.xcu"
chown -R jupiter-ppt:jupiter-ppt "$job"
systemd-run --quiet --wait --collect --unit="jupiter-ppt-$1" \
 -p User=jupiter-ppt -p Group=jupiter-ppt -p PrivateNetwork=yes -p PrivateTmp=yes \
 -p ProtectSystem=strict -p ProtectHome=yes -p NoNewPrivileges=yes \
 -p ProtectProc=invisible -p RestrictSUIDSGID=yes -p PrivateDevices=yes \
 -p 'CapabilityBoundingSet=' -p 'RestrictAddressFamilies=AF_UNIX' \
 -p 'InaccessiblePaths=/etc/jupiter-producer /opt/jupiter-producer' \
 -p "ReadWritePaths=$job" -p MemoryMax=1G -p CPUQuota=100% -p TasksMax=64 \
 -p RuntimeMaxSec=60 -p LimitCORE=0 -p LimitFSIZE=52428800 \
 -p StandardOutput=null -p StandardError=null \
 --setenv="HOME=$job" --setenv="TMPDIR=$job" \
 /usr/bin/libreoffice "-env:UserInstallation=file://$job/profile" --headless --nologo --nodefault --norestore \
 --convert-to pdf:impress_pdf_Export --outdir "$job" "$job/input.$2"
