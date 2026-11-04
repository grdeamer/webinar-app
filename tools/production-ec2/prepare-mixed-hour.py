#!/usr/bin/env python3
"""Root-only one-use test preparation. Requires separately verified cloud shutdown; does not start EC2."""
import datetime,json,os,pathlib,re,subprocess,time
assert os.geteuid()==0 and pathlib.Path('/etc/jupiter-producer-node').exists()
plan=json.loads(pathlib.Path(__import__('sys').argv[1]).read_text())
assert plan['instanceId']=='i-00c2cf0d3c3a48b63' and plan['costApproved'] is True
assert plan['approvedBudgetUsd']==2 and plan['recording'] is False
assert plan['cloudStopVerified'] is True and plan['cloudStopAtMs']-time.time()*1000<=70*60000
approval=plan['approval'];uid=approval['approvalId'];assert re.fullmatch('[a-f0-9-]{36}',uid)
assert approval['kind']=='original-room-mixed-hour' and approval['cloudStopAtMs']==plan['cloudStopAtMs']
assert approval['mediaStopAtMs']<=approval['cloudStopAtMs']-60000 and approval['mediaStopAtMs']>time.time()*1000+61*60000
assert approval['approvedBudgetUsd']==2 and approval['networkLimitBytes']==4000000000 and approval['recording'] is False
root=pathlib.Path('/var/lib/jupiter-producer/soak-results')
root.mkdir(parents=True,exist_ok=True,mode=0o700)
# This marker survives a reconnect/reboot; the same approval can never start a second run.
markers=pathlib.Path('/var/lib/jupiter-producer/soak-approvals-used');markers.mkdir(parents=True,exist_ok=True,mode=0o700);os.chown(markers,0,0);markers.chmod(0o700)
used=markers/(uid+'.used');fd=os.open(used,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600);os.write(fd,b'prepared\n');os.close(fd)
subprocess.run(['systemctl','stop','jupiter-producer.service','jupiter-livekit.service'],check=True)
runtime=pathlib.Path('/run/jupiter-approved-hour-'+uid);runtime.mkdir(mode=0o700)
(runtime/'approval.json').write_text(json.dumps(approval));(runtime/'approval.json').chmod(0o600)
# systemd reads this file as root. It contains no media/signing credentials.
(runtime/'profile.env').write_text('\n'.join([
 'PRODUCER_ENGINE_MIXED_HOUR=1','PRODUCER_ENGINE_HOUR_SOAK=0',
 'PRODUCER_ENGINE_DEADLINE_MS='+str(approval['mediaStopAtMs']),
 'PRODUCER_ENGINE_MIXED_HOUR_APPROVAL_FILE='+str(runtime/'approval.json'),
 'PRODUCER_ENGINE_NETWORK_START_FILE=/run/jupiter-producer/network-start.json',
 'PRODUCER_ENGINE_SESSION_CAP_USD=5',
 'TMPDIR=/run/jupiter-producer','HOME=/run/jupiter-producer',
 'PLAYWRIGHT_BROWSERS_PATH=/opt/jupiter-producer/browsers'])+'\n');(runtime/'profile.env').chmod(0o600)
# The approval is public test metadata, readable only by the dedicated engine user.
import pwd
owner=pwd.getpwnam('jupiter-producer');os.chown(runtime,owner.pw_uid,owner.pw_gid);os.chown(runtime/'approval.json',owner.pw_uid,owner.pw_gid)
result=root/uid;result.mkdir(mode=0o700);os.chown(result,owner.pw_uid,owner.pw_gid)
# Root owns the parent; the engine can write only its exact result directory.
os.chown(root,0,0);root.chmod(0o711)
remaining=int((approval['mediaStopAtMs']-time.time()*1000)/1000)
def write(path,text):path.parent.mkdir(parents=True,exist_ok=True);path.write_text(text);path.chmod(0o644)
write(pathlib.Path('/run/systemd/system/jupiter-livekit.service.d/90-approved-hour.conf'),'[Service]\nRuntimeMaxSec='+str(remaining)+'s\n')
stop=datetime.datetime.fromtimestamp(plan['cloudStopAtMs']/1000,datetime.timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')
write(pathlib.Path('/run/systemd/system/jupiter-producer-boot-stop.timer.d/90-approved-hour.conf'),'[Timer]\nOnBootSec=\nOnCalendar='+stop+'\nPersistent=false\n')
unit='jupiter-original-hour-'+uid+'.service'
write(pathlib.Path('/run/systemd/system')/unit,'''[Unit]
Description=Approved one-use original producer room mixed-media hour
Requires=jupiter-livekit.service jupiter-producer-maintenance.service
After=jupiter-livekit.service jupiter-producer-maintenance.service
[Service]
User=jupiter-producer
Group=jupiter-producer
WorkingDirectory=/opt/jupiter-producer
EnvironmentFile=/etc/jupiter-producer/engine.env
EnvironmentFile='''+str(runtime/'profile.env')+'''
ExecStart=/opt/jupiter-producer/start-mixed-hour.sh
ExecStopPost=+/usr/bin/systemctl --no-block stop jupiter-livekit.service jupiter-presentation-converter.socket jupiter-presentation-converter.service
RuntimeDirectory=jupiter-producer
RuntimeDirectoryMode=0700
RuntimeMaxSec='''+str(remaining)+'''s
TimeoutStopSec=25
KillMode=control-group
Restart=no
LimitCORE=0
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ReadWritePaths=/run/jupiter-producer /run/jupiter-presentations '''+str(result)+'\n')
subprocess.run(['systemctl','daemon-reload'],check=True)
subprocess.run(['systemctl','restart','jupiter-producer-boot-stop.timer'],check=True)
subprocess.run(['systemd-analyze','verify','/run/systemd/system/'+unit],check=True)
print(json.dumps({'prepared':True,'unit':unit,'mediaStopAtMs':approval['mediaStopAtMs'],'cloudStopAtMs':plan['cloudStopAtMs'],'started':False}))
