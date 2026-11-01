#!/usr/bin/env python3
"""Independent guest limit. Reads byte counters, never program media."""
import json, pathlib, subprocess, time
ROOT = pathlib.Path('/run/jupiter-selfhost-test')
plan = json.loads((ROOT / 'plan.json').read_text())
def network():
    return sum(int((p/'statistics'/name).read_text()) for p in pathlib.Path('/sys/class/net').iterdir() if p.name != 'lo' for name in ['rx_bytes','tx_bytes'])
start = network()
while ROOT.exists():
    current = network()
    if current < start or current-start >= plan['bidirectionalNetworkByteLimit'] or time.time()*1000 >= plan['guardDeadlineMs']:
        subprocess.run(['/usr/bin/python3', str(pathlib.Path(__file__).parent/'cleanup.py'), plan['testId'], '--guard'])
        subprocess.run(['/sbin/shutdown', '-h', 'now'])
        break
    time.sleep(1)
