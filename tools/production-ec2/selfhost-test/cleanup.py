#!/usr/bin/env python3
"""Restore only this test's files/units; never restart the Cloud-backed engine."""
import json, pathlib, shutil, subprocess, sys, time

ROOT = pathlib.Path('/run/jupiter-selfhost-test')
BACKUP = pathlib.Path('/var/lib/jupiter-selfhost-test')
APP = pathlib.Path('/opt/jupiter-producer')
plan = json.loads((BACKUP / 'active.json').read_text())
assert plan['testId'] == sys.argv[1], 'Wrong test ID'
assert plan['instanceId'] == 'i-00c2cf0d3c3a48b63'

def run(*args):
    return subprocess.run(args, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode

run('systemctl', 'stop', 'jupiter-selfhost-test-qualify')
run('systemctl', 'stop', 'jupiter-producer')
# Delete only the exact test runtime's rooms before stopping its relay.
if (ROOT / 'engine.env').exists() and (ROOT / 'runtime-id').exists():
    result = run('/usr/local/bin/node', str(pathlib.Path(__file__).parent / 'rooms-cleanup.cjs'))
    if result: raise RuntimeError('Owned room cleanup requires verification')
run('systemctl', 'stop', 'jupiter-livekit-selfhost-test')
for relative in ['scripts/production-producer-hosted.ts', 'lib/production/localProducerRehearsal.ts']:
    shutil.copy2(BACKUP / relative, APP / relative)
shutil.copy2(BACKUP / 'Caddyfile', '/etc/caddy/Caddyfile')
shutil.copy2(BACKUP / 'hosts', '/etc/hosts')
dropin = pathlib.Path('/run/systemd/system/jupiter-producer.service.d/40-selfhost-test.conf')
dropin.unlink(missing_ok=True)
run('systemctl', 'daemon-reload')
run('systemctl', 'reload', 'caddy')
worker_pids = subprocess.run(['pgrep', '-u', 'jupiter-producer'], capture_output=True, text=True).stdout.split()
assert not worker_pids, 'Owned media processes remain'
result = {'testId': plan['testId'], 'workersStopped': True, 'sfuStopped': True,
          'originalFilesRestored': True, 'privateTestKeysRemoved': True, 'recording': False, 'atMs': int(time.time()*1000)}
(BACKUP / 'cleanup-result.json').write_text(json.dumps(result))
if ROOT.exists(): shutil.rmtree(ROOT)
(BACKUP / 'active.json').rename(BACKUP / 'completed-plan.json')
if '--guard' not in sys.argv: run('systemctl', 'stop', 'jupiter-selfhost-test-guard')
print(json.dumps(result))
