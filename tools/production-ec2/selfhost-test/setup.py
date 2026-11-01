#!/usr/bin/env python3
"""Root-only, one-run installation. No secrets in arguments, logs or user-data."""
import datetime, hashlib, json, os, pathlib, secrets, shutil, subprocess, sys, tarfile, time

ROOT = pathlib.Path('/run/jupiter-selfhost-test')
BACKUP = pathlib.Path('/var/lib/jupiter-selfhost-test')
APP = pathlib.Path('/opt/jupiter-producer')
HERE = pathlib.Path(__file__).resolve().parent

def write(path, text, mode=0o600):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text)
    path.chmod(mode)

def run(*args):
    subprocess.run(args, check=True, stdout=subprocess.DEVNULL)

assert os.geteuid() == 0 and pathlib.Path('/etc/jupiter-producer-node').exists()
plan = json.loads((HERE / 'approved-plan.json').read_text())
assert plan['costApproved'] and plan['accessApproved'] and plan['proposedIncrementalCapUsd'] == 1
deadline = int(plan['guardDeadlineMs'])
assert 60_000 < deadline - time.time() * 1000 < 30 * 60_000
assert not ROOT.exists(), 'Previous test must be cleaned up before installation'
ROOT.mkdir(mode=0o700)
BACKUP.mkdir(mode=0o700, exist_ok=True)
assert not (BACKUP / 'active.json').exists(), 'Previous rollback evidence remains'
write(BACKUP / 'active.json', json.dumps(plan))
for relative in ['scripts/production-producer-hosted.ts', 'lib/production/localProducerRehearsal.ts']:
    target = BACKUP / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(APP / relative, target)
shutil.copy2('/etc/caddy/Caddyfile', BACKUP / 'Caddyfile')
shutil.copy2('/etc/hosts', BACKUP / 'hosts')
write(ROOT / 'plan.json', json.dumps(plan))

# The pre-existing Cloud-backed worker must stop before any self-hosted samples.
run('systemctl', 'stop', 'jupiter-producer')
archive = HERE / 'livekit_1.13.11_linux_amd64.tar.gz'
assert hashlib.sha256(archive.read_bytes()).hexdigest() == plan['sfuBinarySha256']
with tarfile.open(archive) as bundle:
    member = next(x for x in bundle.getmembers() if pathlib.PurePosixPath(x.name).name == 'livekit-server' and x.isfile())
    binary = APP / 'bin/livekit-server-1.13.11'
    binary.parent.mkdir(exist_ok=True)
    binary.write_bytes(bundle.extractfile(member).read())
    binary.chmod(0o755)

original = {}
for line in pathlib.Path('/etc/jupiter-producer/engine.env').read_text().splitlines():
    key, value = line.split('=', 1)
    original[key] = json.loads(value)
key, secret = 'SH_' + secrets.token_hex(12), secrets.token_urlsafe(48)
hostname = plan['proposedHostname']
config = {'port': 7880, 'bind_addresses': ['0.0.0.0'], 'log_level': 'warn',
          'rtc': {'tcp_port': 7881, 'udp_port': 7882, 'use_external_ip': False,
                  'node_ip': plan['publicIp'], 'advertise_internal_ip': True, 'enable_loopback_candidate': True},
          'keys': {key: secret}, 'room': {'empty_timeout': 30, 'departure_timeout': 5, 'max_participants': 16},
          'turn': {'enabled': False}}
write(ROOT / 'livekit.json', json.dumps(config))
env = {k: original[k] for k in ['PRODUCER_ENGINE_SECRET', 'PRODUCER_ENGINE_EVENT_ID', 'PRODUCER_ENGINE_SESSION_ID']}
env.update(LIVEKIT_URL='wss://' + hostname, LIVEKIT_API_KEY=key, LIVEKIT_API_SECRET=secret)
write(ROOT / 'engine.env', '\n'.join(k + '=' + json.dumps(v) for k, v in env.items()) + '\n')
for relative in ['scripts/production-producer-hosted.ts', 'lib/production/localProducerRehearsal.ts']:
    shutil.copy2(HERE / 'runtime' / relative, APP / relative)

write(pathlib.Path('/run/systemd/system/jupiter-livekit-selfhost-test.service'), f'''[Unit]
Description=Bounded Jupiter self-hosted LiveKit test (no recorder)
After=network-online.target
[Service]
User=jupiter-producer
Group=jupiter-producer
LoadCredential=livekit.json:{ROOT}/livekit.json
ExecStart={binary} --config %d/livekit.json
Environment=TMPDIR=/run/jupiter-livekit-test
RuntimeDirectory=jupiter-livekit-test
RuntimeDirectoryMode=0700
RuntimeMaxSec=25min
TimeoutStopSec=15
KillMode=control-group
Restart=no
LimitCORE=0
NoNewPrivileges=true
ProtectSystem=strict
PrivateTmp=true
ReadWritePaths=/run/jupiter-livekit-test
StandardOutput=append:{ROOT}/sfu.log
StandardError=inherit
''', 0o644)
write(pathlib.Path('/run/systemd/system/jupiter-producer.service.d/40-selfhost-test.conf'), f'''[Unit]
After=jupiter-livekit-selfhost-test.service
Requires=jupiter-livekit-selfhost-test.service
[Service]
EnvironmentFile=
EnvironmentFile={ROOT}/engine.env
''', 0o644)
write(pathlib.Path('/etc/caddy/Caddyfile'), (BACKUP / 'Caddyfile').read_text() + f'\n{hostname} {{\n  reverse_proxy 127.0.0.1:7880\n}}\n', 0o644)
# Same-host compositor signaling stays local while the browser uses public DNS.
write(pathlib.Path('/etc/hosts'), (BACKUP / 'hosts').read_text() + '\n127.0.0.1 ' + hostname + '\n', 0o644)
write(pathlib.Path('/run/systemd/system/jupiter-selfhost-test-guard.service'), f'''[Unit]
Description=Exact-run self-hosted test deadline and traffic guard
[Service]
Type=simple
ExecStart=/usr/bin/python3 {HERE}/guard.py
Restart=no
RuntimeMaxSec=30min
LimitCORE=0
''', 0o644)
run('systemctl', 'daemon-reload')
run('systemctl', 'start', 'jupiter-selfhost-test-guard')
run('caddy', 'validate', '--config', '/etc/caddy/Caddyfile')
run('systemctl', 'reload', 'caddy')
run('systemctl', 'start', 'jupiter-livekit-selfhost-test')
print(json.dumps({'prepared': True, 'testId': plan['testId'], 'deadlineMs': deadline,
                  'sfuVersion': '1.13.11', 'recording': False, 'engineStarted': False}))
