#!/usr/bin/env python3
"""One-boot setup budget guard; no recording, credentials or process arguments."""
import json,pathlib,subprocess,time
plan=json.loads(pathlib.Path('/opt/jupiter-producer-selfhost-tools/approved-plan.json').read_text())
assert plan['instanceId']=='i-00c2cf0d3c3a48b63' and plan['costApproved']
def network():return sum(int((p/'statistics'/name).read_text()) for p in pathlib.Path('/sys/class/net').iterdir() if p.name!='lo' for name in ['rx_bytes','tx_bytes'])
start=network()
while True:
 now=network()
 if now<start or now-start>=1_000_000_000 or time.time()*1000>=plan['setupDeadlineMs']:
  subprocess.run(['systemctl','stop','jupiter-producer','jupiter-livekit'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
  subprocess.run(['/sbin/shutdown','-h','now']);break
 time.sleep(1)
