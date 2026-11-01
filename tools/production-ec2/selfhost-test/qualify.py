#!/usr/bin/env python3
"""Short, metadata-only 1080p30 / failover assessment, exact runtime only."""
import json, pathlib, sys, time, urllib.request, subprocess
ROOT = pathlib.Path('/run/jupiter-selfhost-test')
OUT = pathlib.Path('/var/lib/jupiter-selfhost-test')
plan = json.loads((ROOT/'plan.json').read_text())
run_id, mode = sys.argv[1:3]
assert mode in ['generated', 'file-faults']
assert run_id == (ROOT/'runtime-id').read_text().strip()
result = {'testId':plan['testId'],'runId':run_id,'mode':mode,'outcome':'running',
          'windows':[],'events':[],'qualifiedSteadyMs':0,'recording':False}
path = OUT/(mode+'-result.json')

def save():
    path.write_text(json.dumps(result,indent=2))

def request(path, body=None):
    headers={'Content-Type':'application/json','X-Jupiter-Local':'phase7'}
    r=urllib.request.Request('http://127.0.0.1:4311'+path, data=None if body is None else json.dumps(body).encode(), headers=headers)
    with urllib.request.urlopen(r,timeout=5) as response:return json.load(response)

def status():
    assert time.time()*1000 < plan['guardDeadlineMs']-30_000, 'Deadline too near'
    s=request('/api/ha/status')
    assert s['runId']==run_id and s['running'] and not s['failure'], 'Runtime failed or identity changed'
    assert s['recordingEnabled'] is False and s['authorityAvailable'], 'Recording or authority invariant failed'
    memory={a:int(b.split()[0]) for a,b in (x.split(':',1) for x in pathlib.Path('/proc/meminfo').read_text().splitlines())}
    assert memory['MemAvailable'] >= 512*1024, 'Memory safety floor'
    result['minimumAvailableMemoryKiB']=min(result.get('minimumAvailableMemoryKiB',memory['MemAvailable']),memory['MemAvailable'])
    return s

first=status();video_sid=first['observer']['videoTrackSid'];audio_sid=first['observer']['audioTrackSid'];revision=first['revision']

def validate(s, steady=True):
    o=s['observer']; now=time.time()*1000
    assert [o['width'],o['height']]==[1920,1080], 'Resolution loss'
    assert o['selectionMismatches']==0 and o['videoTrackSid']==video_sid and o['audioTrackSid']==audio_sid, 'Publication/provenance loss'
    assert s['revision']==revision, 'Unplanned operator change'
    assert now-o['atMs']<1500 and now-o['lastGoodAtMs']<1000, 'Receiver stalled'
    assert s['gateway']['outputError'] is None, 'Gateway error'
    if steady:
        assert o['candidate']==s['selected']==o['contentCandidate'] and o['generation']==s['generation'], 'Wrong authority'
        assert all(not w['exited'] for w in s['workers']), 'Unexpected worker exit'
    return o

def warm(s, role):
    c=s['candidates'].get(role);g=s.get('gateway');i=(g or {}).get('inputs',{}).get('candidate-'+role)
    return bool(c and not c['error'] and c['revision']==s['revision'] and time.time()*1000-c['progressedAtMs']<700 and i and i['revision']==s['revision'] and time.time()*1000-g['atMs']+i['ageMs']<350)

def until(predicate, seconds=20):
    end=time.monotonic()+seconds
    while time.monotonic()<end:
        s=status()
        if predicate(s):return s
        time.sleep(.1)
    raise AssertionError('Bounded recovery timeout')

def action(name):
    s=status()
    return request('/api/ha/action',{'runId':run_id,'expectedGeneration':s['generation'],'action':name})

def resource_counters():
    cpu=[int(x) for x in pathlib.Path('/proc/stat').read_text().splitlines()[0].split()[1:]]
    net={p.name:{k:int((p/'statistics'/k).read_text()) for k in ['rx_bytes','tx_bytes']} for p in pathlib.Path('/sys/class/net').iterdir()}
    return {'cpuTotal':sum(cpu),'cpuIdle':cpu[3]+cpu[4],'network':net}

resources_before=resource_counters()

def assess(seconds):
    points=[];start=time.monotonic();generation=status()['generation'];qualified_before=result['qualifiedSteadyMs']
    while result['qualifiedSteadyMs']-qualified_before < (seconds-5)*1000:
        assert time.monotonic()-start < seconds+35, 'Steady-window collection exceeded bounded allowance'
        s=status();o=validate(s);assert s['generation']==generation,'Unplanned takeover'
        source=s['sourceMedia']['source-a'];g=s['gateway'];candidate=s['candidateMedia'][s['selected']]
        points.append({'atMs':o['atMs'],'valid':o['validFrames'],'decoded':o['rtc']['framesDecoded'],
          'presented':o['presentedFrames'],'sourceAtMs':source['atMs'],'sourceEncoded':source['encoding']['framesEncoded'],
          'nativeCaptured':source['encoding'].get('nativeFramesCaptured'),'sourceWidth':source['encoding']['width'],
          'sourceHeight':source['encoding']['height'],'width':o['width'],'height':o['height'],
          'gatewayWritten':g.get('capture',{}).get('written'),'candidateWritten':candidate.get('capture',{}).get('written'),
          'packetLoss':o['rtc']['packetsLost'],'audioRms':o['audioRms']})
        if len(points)>1 and points[-1]['atMs']-points[0]['atMs']>=30_000:
            a,b=points[0],points[-1];dt=(b['atMs']-a['atMs'])/1000;sd=(b['sourceAtMs']-a['sourceAtMs'])/1000
            m={'seconds':dt,'distinctFps':(b['valid']-a['valid'])/dt,'decodedFps':(b['decoded']-a['decoded'])/dt,
               'presentedFps':(b['presented']-a['presented'])/dt,'sourceEncodedFps':(b['sourceEncoded']-a['sourceEncoded'])/sd,
               'width':1920,'height':1080,'packetLossDelta':b['packetLoss']-a['packetLoss']}
            if mode=='file-faults':
                assert a['nativeCaptured'] is not None and b['nativeCaptured'] is not None,'Native file counters missing'
                m['sourceCapturedFps']=(b['nativeCaptured']-a['nativeCaptured'])/sd
            for k,v in m.items():
                if k.endswith('Fps'):assert 29.5<=v<=30.5, k+' outside 29.5-30.5: '+str(v)
            result['windows'].append(m);result['qualifiedSteadyMs']+=dt*1000;save();points=points[-1:]
        time.sleep(1)

    assert result['qualifiedSteadyMs']-qualified_before >= (seconds-5)*1000, 'Insufficient qualified steady observation'

def fault(kind):
    until(lambda s:warm(s,'primary') and warm(s,'standby'))
    if status()['selected']!='primary':
        action('promote-primary');until(lambda s:s['observer']['candidate']=='primary' and s['observer']['generation']==s['generation'])
    before=status();began=int(time.time()*1000);action('freeze-primary' if kind=='stall' else 'crash-primary')
    s=until(lambda s:s['generation']>before['generation'] and s['observer']['candidate']=='standby' and s['observer']['generation']==s['generation'] and s['observer']['lastSelection']['firstPresentedAtMs']>=began,10)
    o=validate(s,False);gap=o['lastSelection']['videoGapMs'];assert gap<1000,'Picture gap >=1 second'
    event={'kind':kind,'beganAtMs':began,'pictureGapMs':gap,'recoveryAfterInjectionMs':o['lastSelection']['firstPresentedAtMs']-began}
    if kind=='stall':assert s['candidates']['primary']['reportedAtMs']>began,'Stall heartbeat lost'
    else:assert next(w for w in s['workers'] if w['role']=='primary')['exited'],'Crash not observed'
    action('heal-primary' if kind=='stall' else 'restart-primary')
    until(lambda s:warm(s,'primary') and warm(s,'standby'))
    event['restoredAtMs']=int(time.time()*1000);result['events'].append(event);save()

save()
try:
    until(lambda s:warm(s,'primary') and warm(s,'standby'))
    assess(120 if mode=='generated' else 60)
    if mode=='file-faults':
        for kind in ['stall','crash']:
            fault(kind);assess(60)
    result['outcome']='completed';result['programPublicationsPreserved']=True;result['provenanceMismatches']=0
except Exception as error:
    result['outcome']='failed';result['error']=str(error)
    subprocess.run(['systemctl','stop','jupiter-producer'],stdout=subprocess.DEVNULL)
finally:
    after=resource_counters();total=after['cpuTotal']-resources_before['cpuTotal'];result['hostCpuPercent']=100*(1-(after['cpuIdle']-resources_before['cpuIdle'])/total) if total else None
    result['networkBytes']={name:{k:value-resources_before['network'].get(name,{}).get(k,0) for k,value in counters.items()} for name,counters in after['network'].items()}
    result['endedAtMs']=int(time.time()*1000);save()
