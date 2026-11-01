#!/usr/bin/env python3
"""One guarded production cutover on the existing marked EC2 node; no media storage."""
import hashlib,json,os,pathlib,secrets,shutil,subprocess,time
HERE=pathlib.Path(__file__).resolve().parent
APP=pathlib.Path('/opt/jupiter-producer');ETC=pathlib.Path('/etc/jupiter-producer')
plan=json.loads((HERE/'approved-plan.json').read_text())
assert os.geteuid()==0 and pathlib.Path('/etc/jupiter-producer-node').exists()
assert plan['instanceId']=='i-00c2cf0d3c3a48b63' and plan['costApproved'] and plan['accessApproved']
assert 60_000 < plan['setupDeadlineMs']-time.time()*1000 < 30*60_000
assert not pathlib.Path('/run/jupiter-selfhost-test').exists(),'Temporary test must be cleaned first'
BACKUP=pathlib.Path('/var/lib/jupiter-livekit-cutover')
assert not BACKUP.exists(),'Reconcile existing cutover; never overwrite rollback evidence'
def run(*args):subprocess.run(args,check=True,stdout=subprocess.DEVNULL)
def write(path,body,mode=0o600):
 path.parent.mkdir(parents=True,exist_ok=True);path.write_text(body);path.chmod(mode)
run('systemctl','stop','jupiter-producer')
BACKUP.mkdir(mode=0o700)
for source,name in [(ETC/'engine.env','engine.env'),(pathlib.Path('/etc/caddy/Caddyfile'),'Caddyfile'),(pathlib.Path('/etc/hosts'),'hosts')]:shutil.copy2(source,BACKUP/name);(BACKUP/name).chmod(0o600)
for rel in ['lib/production/localProducerRehearsal.ts','scripts/production-producer-hosted.ts']:
 target=BACKUP/rel;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(APP/rel,target)
write(BACKUP/'plan.json',json.dumps(plan))
# This reads existing credentials only on EC2 and returns counts, never room names or keys.
audit=subprocess.run(['/usr/local/bin/node',str(HERE/'audit-cloud.cjs')],capture_output=True,text=True,timeout=20)
assert audit.returncode==0,'Cloud room/export inventory failed; no routing change applied'
counts=json.loads(audit.stdout);assert counts['rooms']==0 and counts['activeExports']==0,'Active Cloud media must be drained before cutover'
write(BACKUP/'cloud-inventory.json',json.dumps(counts))
run('apt-get','update','-qq');run('apt-get','install','-y','-qq','haproxy')
# A package install must not occupy the existing public TLS listener.
subprocess.run(['systemctl','stop','haproxy'],stdout=subprocess.DEVNULL)
archive=HERE/'livekit_1.13.11_linux_amd64.tar.gz'
assert hashlib.sha256(archive.read_bytes()).hexdigest()=='1e9ee90ca301e1842b2887fc77cb122759756a9c8aeb4334ee91de3325ec43fb'
import tarfile
with tarfile.open(archive) as tar:
 member=next(m for m in tar.getmembers() if pathlib.PurePosixPath(m.name).name=='livekit-server' and m.isfile());binary=APP/'bin/livekit-server-1.13.11';binary.parent.mkdir(exist_ok=True);binary.write_bytes(tar.extractfile(member).read());binary.chmod(0o755)
api={'hostname':'producer-rtc.jupiter.events','turnHostname':'producer-turn.jupiter.events','apiKey':'JPR_'+secrets.token_hex(12),'apiSecret':secrets.token_urlsafe(48)}
write(ETC/'livekit-api.json',json.dumps(api))
env={}
for line in (ETC/'engine.env').read_text().splitlines():
 if line.strip():k,v=line.split('=',1);env[k]=json.loads(v)
env.update(LIVEKIT_URL='wss://'+api['hostname'],LIVEKIT_API_KEY=api['apiKey'],LIVEKIT_API_SECRET=api['apiSecret'],LIVEKIT_DEPLOYMENT='self-hosted',LIVEKIT_RECORDING_ENABLED='false')
# Retain existing scoped HMAC configuration, never copy the signing secret elsewhere.
write(ETC/'engine.env','\n'.join(k+'='+json.dumps(v) for k,v in env.items())+'\n')
public=APP/'selfhost';public.mkdir(exist_ok=True)
shutil.copy2(HERE/'prepare-relay.py',public/'prepare-relay.py');(public/'prepare-relay.py').chmod(0o755)
for rel in ['lib/production/localProducerRehearsal.ts','scripts/production-producer-hosted.ts']:shutil.copy2(HERE/'runtime'/rel,APP/rel)
# Bootstrap trusted certificates while original Caddy still owns public443.
bootstrap=(BACKUP/'Caddyfile').read_text()+'''\nproducer-rtc.jupiter.events, producer-turn.jupiter.events {\n  tls {\n    issuer acme {\n      disable_tlsalpn_challenge\n    }\n  }\n  respond 404\n}\n'''
write(pathlib.Path('/etc/caddy/Caddyfile'),bootstrap,0o644);run('caddy','validate','--config','/etc/caddy/Caddyfile');run('systemctl','reload','caddy')
end=time.monotonic()+100
while True:
 ok=True
 for host in [api['hostname'],api['turnHostname']]:
  result=subprocess.run(['curl','--fail','--silent','--output','/dev/null','--resolve',host+':443:127.0.0.1','https://'+host+'/'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
  # Bootstrap responds404; curl exit22 proves a trusted TLS handshake completed.
  ok=ok and result.returncode in [0,22]
 if ok:break
 assert time.monotonic()<end,'Trusted relay certificates not ready';time.sleep(2)
write(pathlib.Path('/etc/haproxy/haproxy.cfg'),(HERE/'haproxy.cfg').read_text(),0o644)
run('haproxy','-c','-f','/etc/haproxy/haproxy.cfg')
write(pathlib.Path('/etc/caddy/Caddyfile'),(HERE/'Caddyfile').read_text(),0o644);run('caddy','validate','--config','/etc/caddy/Caddyfile')
write(pathlib.Path('/etc/systemd/system/jupiter-livekit.service'),(HERE/'jupiter-livekit.service').read_text(),0o644)
write(pathlib.Path('/etc/systemd/system/jupiter-producer.service.d/50-selfhost.conf'),(HERE/'50-selfhost.conf').read_text(),0o644)
# Keep EC2-internal signaling on loopback; TLS SNI routing still verifies trusted certificates.
write(pathlib.Path('/etc/hosts'),(BACKUP/'hosts').read_text()+'\n127.0.0.1 '+api['hostname']+'\n',0o644)
run('systemctl','daemon-reload');run('systemctl','restart','caddy');run('systemctl','enable','haproxy');run('systemctl','start','haproxy')
run('systemctl','start','jupiter-livekit')
assert subprocess.run(['systemctl','is-enabled','jupiter-producer-boot-stop.timer'],capture_output=True,text=True).stdout.strip()=='enabled'
result={'installed':True,'cloudRoomsBefore':counts['rooms'],'activeCloudExportsBefore':counts['activeExports'],'recording':False,'turnTlsPort':443,'extraIp':False,'engineStarted':False,'installedAtMs':int(time.time()*1000)}
write(BACKUP/'installed.json',json.dumps(result));print(json.dumps(result))
