"""Independent, metadata-only guard for one exact local soak. Never starts or repeats media."""
import json
import os
import signal
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

plan_path = Path(sys.argv[1])
soak_id, owner_pid, owner_birth, host_pid, host_birth, wall_deadline = sys.argv[2:]
owner_pid, host_pid, wall_deadline = int(owner_pid), int(host_pid), float(wall_deadline)
started = time.monotonic()
maximum_duration = max(0, min(65 * 60, wall_deadline - time.time()))
tracked = {}


def processes():
    output = subprocess.check_output(['/bin/ps', '-axo', 'pid=,ppid=,lstart='], text=True,
                                     env={'PATH': '/usr/bin:/bin', 'LC_ALL': 'C'})
    rows = {}
    for line in output.splitlines():
        parts = line.strip().split(None, 2)
        if len(parts) == 3:
            rows[int(parts[0])] = (int(parts[1]), parts[2].strip())
    return rows


def matches(rows, pid, birth):
    return pid in rows and rows[pid][1] == birth


def remember(rows):
    roots = {pid for pid, birth in tracked.items() if matches(rows, pid, birth)}
    if matches(rows, host_pid, host_birth):
        roots.add(host_pid)
    changed = True
    while changed:
        changed = False
        for pid, (parent, birth) in rows.items():
            if parent in roots and pid not in roots:
                roots.add(pid)
                changed = True
    for pid in roots:
        tracked[pid] = rows[pid][1]


def write_result(value):
    path = plan_path.with_name('soak-watchdog-result.json')
    temporary = path.with_suffix('.tmp')
    with open(temporary, 'w', encoding='utf8') as handle:
        os.chmod(temporary, 0o600)
        json.dump(value, handle, indent=2)
        handle.flush()
        os.fsync(handle.fileno())
    os.replace(temporary, path)


write_result({'soakId': soak_id, 'outcome': 'armed', 'hostPid': host_pid, 'hardDeadlineMs': int(wall_deadline * 1000)})

while True:
    rows = processes()
    remember(rows)
    try:
        plan = json.loads(plan_path.read_text())
    except (OSError, ValueError):
        plan = None
    if plan and plan.get('soakId') != soak_id:
        write_result({'soakId': soak_id, 'outcome': 'refused_foreign_plan'})
        sys.exit(1)
    if plan and plan.get('outcome') in ['completed', 'failed', 'cancelled'] and (plan.get('cleanup') or {}).get('workersStopped'):
        write_result({'soakId': soak_id, 'outcome': 'normal_cleanup_verified', 'atMs': int(time.time() * 1000)})
        sys.exit(0)
    reason = None
    if time.time() >= wall_deadline or time.monotonic() - started >= maximum_duration:
        reason = 'hard_deadline'
    elif not matches(rows, owner_pid, owner_birth):
        reason = 'owner_exited'
    if reason:
        # An HTTP stop is allowed only for the exact run recorded by the owner.
        try:
            with urllib.request.urlopen('http://127.0.0.1:4311/api/ha/status', timeout=3) as response:
                state = json.load(response)
            if plan and state.get('runId') == plan.get('runtimeRunId') and (state.get('managedSoak') or state.get('managedLoad') or state.get('rehearsal')):
                body = json.dumps({'action': 'stop', 'runId': state['runId'], 'expectedGeneration': state['generation']}).encode()
                request = urllib.request.Request('http://127.0.0.1:4311/api/ha/action', data=body,
                                                 headers={'Content-Type': 'application/json', 'X-Jupiter-Local': 'phase7'})
                urllib.request.urlopen(request, timeout=10).close()
        except Exception:
            pass
        rows = processes()
        remember(rows)
        # Birth-checked descendants only; never kill arbitrary Chrome or another localhost service.
        for sig, grace in [(signal.SIGTERM, 4), (signal.SIGKILL, 1)]:
            rows = processes()
            for pid, birth in tracked.items():
                if matches(rows, pid, birth):
                    try:
                        os.kill(pid, sig)
                    except ProcessLookupError:
                        pass
            time.sleep(grace)
        rows = processes()
        remaining = [pid for pid, birth in tracked.items() if matches(rows, pid, birth)]
        write_result({'soakId': soak_id, 'outcome': 'safety_cleanup', 'reason': reason,
                      'remainingOwnedPids': remaining, 'atMs': int(time.time() * 1000)})
        sys.exit(1 if remaining else 0)
    time.sleep(2)
