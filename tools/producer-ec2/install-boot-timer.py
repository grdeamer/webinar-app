from pathlib import Path
import subprocess,json,time
assert Path('/etc/jupiter-producer-node').exists()
assert 'WantedBy=multi-user.target' in Path('/etc/systemd/system/jupiter-producer.service').read_text()
folder=Path('/var/lib/jupiter-producer/boot-order-fix');folder.mkdir(mode=0o700,exist_ok=True)
if not (folder/'activation-before.json').exists():
    state=subprocess.run(['systemctl','is-enabled','jupiter-producer.service'],capture_output=True,text=True).stdout.strip()
    (folder/'activation-before.json').write_text(json.dumps({'serviceEnabled':state,'atMs':int(time.time()*1000)}))
timer='''[Unit]
Description=Start Jupiter after boot without blocking cloud-init or Ubuntu maintenance
[Timer]
OnBootSec=5s
Unit=jupiter-producer.service
RemainAfterElapse=yes
[Install]
WantedBy=timers.target
'''
Path('/etc/systemd/system/jupiter-producer-autostart.timer').write_text(timer)
subprocess.run(['systemctl','disable','jupiter-producer.service'],check=True)
subprocess.run(['systemctl','daemon-reload'],check=True)
subprocess.run(['systemd-analyze','verify','jupiter-producer-autostart.timer','jupiter-producer.service'],check=True)
subprocess.run(['systemctl','enable','--now','jupiter-producer-autostart.timer'],check=True)
