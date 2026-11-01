#!/usr/bin/env python3
"""Root-only prestart: load API key and trusted TURN certificate into RAM."""
import json, pathlib, pwd, shutil, os, subprocess, time
ROOT=pathlib.Path('/run/jupiter-livekit')
CONFIG=pathlib.Path('/etc/jupiter-producer/livekit-api.json')
assert os.geteuid()==0 and pathlib.Path('/etc/jupiter-producer-node').exists()
values=json.loads(CONFIG.read_text());assert values['hostname']=='producer-rtc.jupiter.events' and values['turnHostname']=='producer-turn.jupiter.events'
end=time.monotonic()+90
while True:
 certs=list(pathlib.Path('/var/lib/caddy/.local/share/caddy/certificates').glob('*/producer-turn.jupiter.events/producer-turn.jupiter.events.crt'))
 if certs:
  cert=max(certs,key=lambda p:p.stat().st_mtime);key=cert.with_suffix('.key')
  valid=key.is_file() and subprocess.run(['openssl','x509','-in',str(cert),'-checkend','3600','-noout'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL).returncode==0
  if valid:break
 assert time.monotonic()<end,'Trusted TURN certificate must be valid before relay starts'
 time.sleep(2)
uid=pwd.getpwnam('jupiter-producer').pw_uid;gid=pwd.getpwnam('jupiter-producer').pw_gid
ROOT.mkdir(exist_ok=True,mode=0o700)
for src,name in [(cert,'turn.crt'),(key,'turn.key')]:shutil.copyfile(src,ROOT/name);os.chmod(ROOT/name,0o600);os.chown(ROOT/name,uid,gid)
config={'port':7880,'bind_addresses':['127.0.0.1'],'log_level':'error','rtc':{'tcp_port':7881,'udp_port':7882,'use_external_ip':False,'node_ip':'54.84.34.220','advertise_internal_ip':True,'enable_loopback_candidate':True},'keys':{values['apiKey']:values['apiSecret']},'room':{'empty_timeout':30,'departure_timeout':5,'max_participants':64},'turn':{'enabled':True,'tls_port':443,'udp_port':0,'bind_addresses':['127.0.0.2'],'domain':values['turnHostname'],'cert_file':str(ROOT/'turn.crt'),'key_file':str(ROOT/'turn.key'),'proxy_protocol':True,'proxy_protocol_trusted_cidrs':['127.0.0.1/32'],'ttl_seconds':300,'allow_restricted_peer_cidrs':['127.0.0.1/32','172.31.27.165/32']}}
p=ROOT/'livekit.json';p.write_text(json.dumps(config));p.chmod(0o600);os.chown(p,uid,gid)
