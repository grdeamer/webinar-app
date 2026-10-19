"""Rootless, opt-in satellite worker. Credentials flow through stdin only."""
import json
import os
import subprocess
import uuid
from pathlib import Path

IMAGE = 'localhost/jupiter-satellite:live-test-20261019'
KEYS = {'ZOOM_SDK_JWT', 'ZOOM_MEETING_ID', 'ZOOM_MEETING_PASSCODE', 'ZOOM_DISPLAY_NAME',
        'ZOOM_PUBLISH_MODE', 'ZOOM_VIDEO_QUALITY', 'ZOOM_VIDEO_ASPECT', 'ZOOM_ROOM_ID'}

def launch_container(root, home, room_id, relay_root, env):
    if not relay_root:
        raise ValueError('Container test requires the existing program relay')
    rid = str(uuid.UUID(room_id))
    name = 'jupiter-test-' + rid
    private_home = root / 'container-homes' / rid
    private_home.mkdir(mode=0o700, parents=True, exist_ok=True)
    private_home.chmod(0o700)
    uid, gid = os.getuid(), os.getgid()
    args = ['podman', 'run', '--rm', '-i', '--name', name, '--pull=never',
            '--network=slirp4netns:allow_host_loopback=false', '--userns=keep-id', '--user', f'{uid}:{gid}',
            '--read-only', '--cap-drop=all', '--security-opt=no-new-privileges',
            '--pids-limit=256', '--memory=768m', '--memory-swap=768m',
            '--log-driver=none', '--ulimit=core=0:0', '--workdir=/work',
            '--tmpfs', '/run:rw,nosuid,nodev,size=64m,mode=1777',
            '--tmpfs', '/tmp:rw,nosuid,nodev,size=256m,mode=1777',
            '--tmpfs', '/var/tmp:rw,nosuid,nodev,size=32m,mode=1777',
            '--tmpfs', '/var/.zoomsdk:rw,nosuid,nodev,size=32m,mode=1777',
            '--tmpfs', '/var/opt/zoomsdk:rw,nosuid,nodev,size=32m,mode=1777',
            '--volume', f'{private_home}:/home/satellite:rw',
            '--volume', f'{home}:/work:rw', '--volume', f'{relay_root}:/relay:rw',
            '--volume', f'{root / "sdk"}:/opt/jupiter/sdk:ro',
            '--volume', f'{root / "bridge-worker"}:/opt/jupiter/bridge-worker:ro', IMAGE, '--live']
    payload = {key: env[key] for key in KEYS if key in env}
    payload['ZOOM_RELAY_ROOT'] = '/relay'
    runtime_env = podman_environment()
    proc = subprocess.Popen(args, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                            stderr=subprocess.STDOUT, start_new_session=True, env=runtime_env)
    try:
        proc.stdin.write((json.dumps(payload) + '\n').encode())
        proc.stdin.close()
    except (BrokenPipeError, OSError):
        # The caller drains stdout and records a failed startup normally.
        pass
    return proc, name

def podman_environment():
    env = os.environ.copy()
    runtime = Path('/run/user') / str(os.getuid())
    env['XDG_RUNTIME_DIR'] = str(runtime)
    if (runtime / 'bus').exists():
        env['DBUS_SESSION_BUS_ADDRESS'] = 'unix:path=' + str(runtime / 'bus')
    return env

def stop_container(name):
    try:
        subprocess.run(['podman', 'stop', '--time=8', name], stdout=subprocess.DEVNULL,
                       stderr=subprocess.DEVNULL, timeout=15, env=podman_environment())
    except subprocess.TimeoutExpired:
        subprocess.run(['podman', 'kill', name], stdout=subprocess.DEVNULL,
                       stderr=subprocess.DEVNULL, timeout=5, env=podman_environment())
