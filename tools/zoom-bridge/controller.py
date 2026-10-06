"""Outbound Jupiter controller. SDK credentials never leave this host."""
import io, tempfile, shutil, threading
from srt_ingest import Ingest
from preview import Preview
import base64, configparser, hashlib, hmac, json, os, signal, subprocess, time, urllib.request, uuid
from pathlib import Path
ROOT = Path.home() / 'jupiter-zoom'
children = {}
failures = {}
stop_requested = False

def atomic(path, content):
    temp = path.with_suffix('.tmp')
    temp.write_text(content)
    temp.chmod(0o600)
    temp.replace(path)

def read_env(path):
    return dict(line.split('=', 1) for line in path.read_text().splitlines() if '=' in line)

def launch(room, relay_root=None, source=False):
    creds = read_env(ROOT / '.env')
    def enc(value):
        return base64.urlsafe_b64encode(json.dumps(value,separators=(',', ':')).encode()).decode().rstrip('=')
    now = int(time.time())
    body = enc({'alg':'HS256','typ':'JWT'}) + '.' + enc({'appKey':creds['ZOOM_CLIENT_ID'],'iat':now-30,'exp':now+14400,'tokenExp':now+14400})
    signature = base64.urlsafe_b64encode(hmac.new(creds['ZOOM_CLIENT_SECRET'].encode(),body.encode(),hashlib.sha256).digest()).decode().rstrip('=')
    home = ROOT / 'source' if source else ROOT / 'rooms' / str(uuid.UUID(room['id']))
    (home / '.config').mkdir(parents=True,exist_ok=True)
    atomic(home / '.config/zoomus.conf', '[General]\nsystem.audio.type=default\n')
    (home / 'status.ini').unlink(missing_ok=True)
    env = os.environ.copy()
    env.update(HOME=str(home), XDG_CONFIG_HOME=str(home/'.config'), XDG_CACHE_HOME=str(home/'.cache'), ZOOM_SDK_JWT=body+'.'+signature, ZOOM_MEETING_ID=room['meetingId'], ZOOM_MEETING_PASSCODE=room['passcode'], ZOOM_DISPLAY_NAME=room['name'], LD_LIBRARY_PATH=str(ROOT/'sdk')+':'+str(ROOT/'sdk/qt_libs/Qt/lib'), QT_QPA_PLATFORM='offscreen', PULSE_SERVER=os.environ.get('PULSE_SERVER','unix:/run/user/'+str(os.getuid())+'/pulse/native'))
    if not source:
        env['ZOOM_PUBLISH_MODE']=room.get('publishMode','camera')
    if relay_root:
        env.update(ZOOM_RELAY_ROOT=str(relay_root),ZOOM_ROOM_ID=room['id'])
    if source:
        env.update(ZOOM_SOURCE_MODE='1',ZOOM_REVISION=room['revision'])
    log = open(home/'worker.log','w')
    proc = subprocess.Popen([str(ROOT/'bridge-worker')],cwd=home,env=env,stdout=log,stderr=log,start_new_session=True)
    log.close()
    return {'proc':proc,'home':home,'revision':room['revision'],'name':room['name']}

def terminate(item):
    proc = item['proc']
    if proc.poll() is None:
        proc.terminate()
        try: proc.wait(timeout=8)
        except subprocess.TimeoutExpired: proc.kill(); proc.wait(timeout=3)

def report(room_id, item):
    cfg = configparser.ConfigParser(interpolation=None)
    try:
        cfg.read(item['home']/'status.ini')
        status = cfg['worker']
        return {'id':room_id,'status':status.get('status','starting'),'camera':status.getboolean('camera',False),'microphone':status.getboolean('microphone',False),'name':status.get('name',''),'revision':status.get('revision',''),'error':status.get('error',''),'videoResolution':status.get('videoResolution',''),'sourceVideo':status.getboolean('sourceVideo',False),'sourceAudio':status.getboolean('sourceAudio',False),'publishMode':status.get('publishMode','camera'),'originalSound':status.getboolean('originalSound',False)}
    except (KeyError, configparser.Error):
        return {'id':room_id,'status':'starting','camera':False,'microphone':False}

def source_report(item):
    cfg = configparser.ConfigParser(interpolation=None)
    try:
        cfg.read(item['home']/'status.ini'); status=cfg['worker']
        return {'status':status.get('status','starting'),'inputResolutions':status.get('inputResolutions',''),'presenter':status.get('presenter',''),'spotlightCount':status.getint('spotlightCount',0),'video':status.getboolean('video',False),'audio':status.getboolean('audio',False),'videoFrames':status.getint('videoFrames',0),'audioBlocks':status.getint('audioBlocks',0),'revision':status.get('revision',''),'error':status.get('error','')}
    except (KeyError,configparser.Error,ValueError): return {'status':'starting'}

def clear_media(root):
    (root/'video.i420').unlink(missing_ok=True)
    (root/'video.tmp').unlink(missing_ok=True)

def main():
    global stop_requested
    settings = json.loads((ROOT/'controller.json').read_text())
    url = settings['url'].rstrip('/')+'/api/zoom-bridge/agent'
    if not (url.startswith('https://') or url.startswith('http://127.0.0.1:')): raise ValueError('HTTPS required')
    # /dev/shm is RAM-backed on Linux. One latest frame; audio uses local sockets.
    relay_root=Path(tempfile.mkdtemp(prefix='jupiter-io-',dir='/dev/shm'));relay_root.chmod(0o700)
    preview=Preview(relay_root,settings);preview.start()
    capacity = int(settings.get('capacity',2))
    srt_mode=settings.get('sourceType')=='srt'
    ingest=None;ingest_thread=None
    last_ok = time.monotonic();reports=[];source_status=None;source_item=None;source_failure=None
    try:
        while not stop_requested:
            try:
                req = urllib.request.Request(url,data=json.dumps({'reports':reports,'sourceReport':source_status}).encode(),headers={'Content-Type':'application/json','Authorization':'Bearer '+settings['token']})
                with urllib.request.urlopen(req,timeout=12) as response: config=json.load(response)
                rooms=config['rooms'];source=config.get('source');last_ok=time.monotonic()
                srt_mode=bool(source and source.get('kind',settings.get('sourceType','zoom'))=='srt')
                if srt_mode:
                    if source and source['running']:
                        if ingest is None:
                            ingest=Ingest(relay_root,json.loads((ROOT/'srt-settings.json').read_text()),ROOT/'srt')
                            ingest_thread=threading.Thread(target=ingest.run,daemon=True);ingest_thread.start()
                        source_status=ingest.status();source_status['revision']=source['revision']
                        if not ingest_thread.is_alive():source_status.update(status='failed',error='SRT receiver stopped. Disconnect source and reconnect to retry.')
                    else:
                        if ingest:
                            ingest.close();ingest_thread.join(timeout=8);ingest=None;clear_media(relay_root)
                        source_status={'kind':'srt','status':'stopped','revision':source['revision'] if source else ''}
                if source_item and (not source or not source['running'] or source_item['revision']!=source['revision']):
                    terminate(source_item);source_item=None;clear_media(relay_root)
                if source_item and source_item['proc'].poll() is not None:
                    source_failure=source_item['revision'];source_item=None;clear_media(relay_root)
                if not srt_mode and source and source['running']:
                    if source_failure==source['revision']:
                        source_status={'status':'failed','revision':source['revision'],'error':'Source exited. Disconnect and reconnect to retry.'}
                    else:
                        if not source_item: source_item=launch(source,relay_root,True)
                        source_status=source_report(source_item)
                elif not srt_mode:
                    source_failure=None;source_status={'status':'stopped','revision':source['revision'] if source else ''};clear_media(relay_root)
                # Source configured -> relay mode, even while disconnected. Never send test tone by accident.
                mode='relay' if source else 'countdown'
                ids={r['id'] for r in rooms if r['running']}
                for rid in list(children):
                    if rid not in ids or children[rid].get('mode')!=mode or children[rid].get('publishMode')!=next((r.get('publishMode','camera') for r in rooms if r['id']==rid),'camera'):terminate(children.pop(rid))
                reports=[]
                for room in rooms:
                    rid=str(uuid.UUID(room['id']))
                    if not room['running']:
                        failures.pop(rid,None);reports.append({'id':rid,'status':'stopped','camera':False,'microphone':False,'revision':room['revision'],'name':room['name']});continue
                    if not srt_mode and source and room['meetingId']==source['meetingId']:
                        if rid in children:terminate(children.pop(rid))
                        reports.append({'id':rid,'status':'failed','error':'Source meeting cannot be a satellite destination.'});continue
                    item=children.get(rid)
                    if item and item['proc'].poll() is not None:
                        children.pop(rid);failures[rid]={'revision':room['revision'],'status':'failed','error':'Satellite exited. Disconnect and reconnect to retry.'};item=None
                    failure=failures.get(rid)
                    if failure and failure['revision']==room['revision']:
                        reports.append({'id':rid,**failure});continue
                    failures.pop(rid,None)
                    if not item:
                        if len(children)>=capacity:
                            reports.append({'id':rid,'status':'capacity','error':'Test server capacity reached. Disconnect another satellite.'});continue
                        item=launch(room,relay_root if source else None);item['mode']=mode;item['publishMode']=room.get('publishMode','camera');children[rid]=item
                    cfg=configparser.ConfigParser(interpolation=None)
                    preview_expires=preview.request(room)
                    cfg['control']={'preview_expires':str(preview_expires),'name':room['name'],'camera':str(room['camera']).lower(),'microphone':str(room['microphone']).lower(),'revision':room['revision']}
                    content=io.StringIO();cfg.write(content);atomic(item['home']/'control.ini',content.getvalue());reports.append(report(rid,item))
            except Exception as exc:
                print('Controller exchange failed:',type(exc).__name__,flush=True)
                if time.monotonic()-last_ok>60:
                    for item in children.values():terminate(item)
                    children.clear();reports=[]
                    if source_item:terminate(source_item);source_item=None
                    if ingest:
                        ingest.close();ingest_thread.join(timeout=8);ingest=None
                    clear_media(relay_root);source_status={'kind':'srt' if srt_mode else 'zoom','status':'failed','error':'Controller connection lost.'}
            time.sleep(2)
    finally:
        preview.close()
        for item in children.values():terminate(item)
        if source_item:terminate(source_item)
        if ingest:
            ingest.close();ingest_thread.join(timeout=8)
        shutil.rmtree(relay_root,ignore_errors=True)

def stop(signum,frame):
    global stop_requested
    stop_requested=True

if __name__=='__main__':
    signal.signal(signal.SIGTERM,stop);signal.signal(signal.SIGINT,stop)
    main()
