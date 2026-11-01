#!/usr/bin/env python3
"""Restore the exact pre-cutover configuration, keeping all media unstarted."""
import pathlib,subprocess,shutil,os,json
assert os.geteuid()==0 and pathlib.Path('/etc/jupiter-producer-node').exists()
b=pathlib.Path('/var/lib/jupiter-livekit-cutover');assert (b/'plan.json').is_file()
for unit in ['jupiter-producer','jupiter-livekit','haproxy']:subprocess.run(['systemctl','stop',unit],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
subprocess.run(['systemctl','disable','haproxy'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
for name,target in [('engine.env','/etc/jupiter-producer/engine.env'),('Caddyfile','/etc/caddy/Caddyfile'),('hosts','/etc/hosts')]:shutil.copy2(b/name,target)
for rel in ['lib/production/localProducerRehearsal.ts','scripts/production-producer-hosted.ts']:shutil.copy2(b/rel,pathlib.Path('/opt/jupiter-producer')/rel)
pathlib.Path('/etc/systemd/system/jupiter-producer.service.d/50-selfhost.conf').unlink(missing_ok=True)
subprocess.run(['systemctl','daemon-reload'],check=True);subprocess.run(['systemctl','restart','caddy'],check=True)
print(json.dumps({'configurationRolledBack':True,'mediaNotRestarted':True}))
