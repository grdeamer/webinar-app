"""Create credential-free, network-disabled preflight containers. Never joins Zoom."""
import argparse
import os
import subprocess
import uuid
from pathlib import Path

IMAGE = 'localhost/jupiter-satellite:diagnostics-20261017'

def command(room_id, root):
    rid = str(uuid.UUID(room_id))
    name = 'jupiter-satellite-' + rid
    home = root / 'container-preflight' / rid
    home.mkdir(mode=0o700, parents=True, exist_ok=True)
    uid, gid = os.getuid(), os.getgid()
    return ['podman', 'create', '--name', name, '--pull=never', '--network=none',
            '--userns=keep-id', '--user', f'{uid}:{gid}', '--read-only',
            '--cap-drop=all', '--security-opt=no-new-privileges', '--pids-limit=256',
            '--memory=768m', '--memory-swap=768m', '--log-driver=none', '--ulimit=core=0:0',
            '--tmpfs', '/run:rw,nosuid,nodev,size=64m,mode=1777',
            '--tmpfs', f'/tmp:rw,nosuid,nodev,size=256m,mode=1777',
            '--tmpfs', f'/var/tmp:rw,nosuid,nodev,size=32m,mode=1777',
            '--tmpfs', '/var/.zoomsdk:rw,nosuid,nodev,size=32m,mode=1777',
            '--tmpfs', '/var/opt/zoomsdk:rw,nosuid,nodev,size=32m,mode=1777',
            '--volume', f'{home}:/home/satellite:rw',
            '--volume', f'{root / "sdk"}:/opt/jupiter/sdk:ro',
            '--volume', f'{root / "bridge-worker"}:/opt/jupiter/bridge-worker:ro',
            IMAGE, '--preflight']

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('room_ids', nargs='+', type=str)
    parser.add_argument('--root', type=Path, default=Path.home() / 'jupiter-zoom')
    args = parser.parse_args()
    for rid in args.room_ids:
        subprocess.run(command(rid, args.root.resolve()), check=True)
