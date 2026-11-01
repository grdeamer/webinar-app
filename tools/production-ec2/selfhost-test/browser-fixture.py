#!/usr/bin/env python3
"""Loopback-only file fixture. No upload, recording, token logging or cloud storage.
Prepare the exact approved local baseline before starting paid compute. The real
producer UI and ProducerInput remain unchanged; selected FileList stays in RAM.
"""
import hashlib, http.client, http.server, pathlib, time
BASELINE = pathlib.Path('/Users/lets-gd/Documents/Codex/2026-10-02/r/work/Jupiter-Io-1080p30-Baseline.mp4')
assert hashlib.sha256(BASELINE.read_bytes()).hexdigest() == '38ccb201baceca6cfbea8e6aa49047403217b0b3a3965540faead63a2af80b53'
DEADLINE = time.monotonic() + 3600
HTML = b'''<!doctype html><html lang="en"><meta charset="utf-8"><title>Jupiter self-hosted test preparation</title><h1>Self-hosted LiveKit test preparation</h1><p>EC2 stays off until the approved baseline is ready. File bytes remain in browser RAM and publish as a live input. No recording or upload to storage.</p><button id="prepare">Prepare approved baseline</button><button id="open" disabled>Open EC2 producer with prepared file</button><p id="result" role="status">No file prepared</p><script src="/fixture.js"></script></html>'''
JS = '''
let selectedFiles;
const status = document.getElementById('result');
document.getElementById('prepare').onclick = async () => {
 try {
  const response = await fetch('/approved-baseline.mp4', {cache:'no-store',signal:AbortSignal.timeout(10000)});
  if (!response.ok) throw new Error('Baseline unavailable');
  const blob = await response.blob();
  const transfer = new DataTransfer(); transfer.items.add(new File([blob], 'Jupiter-Io-1080p30-Baseline.mp4', {type:'video/mp4'}));
  selectedFiles = transfer.files;
  status.textContent = 'Baseline ready in browser RAM: ' + selectedFiles[0].size + ' bytes. No media session started.';
  document.getElementById('open').disabled = false;
 } catch(error) { status.textContent = error.message; }
};
document.getElementById('open').onclick = async () => {
 try {
  const response = await fetch('/producer', {signal:AbortSignal.timeout(5000)});
  if (!response.ok) throw new Error('EC2 control tunnel is not ready');
  const page = new DOMParser().parseFromString(await response.text(),'text/html');
  document.body.innerHTML = page.body.innerHTML;
  document.querySelector('h1').textContent = 'Self-hosted EC2 rehearsal';
  document.querySelector('aside').textContent = 'Temporary self-hosted LiveKit on EC2. Local SSH control tunnel; browser file publishes live to the approved relay. No recording or persistent media storage. Automatic shutdown enforced.';
  document.querySelector('.badge').textContent = 'Self-hosted EC2 · recording disabled';
  for (const link of page.head.querySelectorAll('link')) document.head.append(link.cloneNode(true));
  for (const original of page.head.querySelectorAll('script')) {
   await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=original.src;script.type=original.type;script.onload=resolve;script.onerror=()=>reject(new Error('Producer script failed'));document.head.append(script)});
  }
  const input = document.getElementById('source-a-file');
  if (!input || !selectedFiles?.length) throw new Error('Prepared file could not be attached');
  input.files = selectedFiles; input.dispatchEvent(new Event('change',{bubbles:true}));
  document.getElementById('message').textContent = 'Approved baseline selected for Input A. Use Play file as input, then Preview A and TAKE.';
  selectedFiles = null;
 } catch(error) { if(document.getElementById('result')) status.textContent=error.message;else document.getElementById('message').textContent=error.message; }
};
'''.encode('utf-8')
class Handler(http.server.BaseHTTPRequestHandler):
 def log_message(self, *_): pass
 def send(self, status, body, mime):
  self.send_response(status); self.send_header('Content-Type',mime); self.send_header('Cache-Control','no-store'); self.send_header('Content-Length',str(len(body))); self.send_header('X-Content-Type-Options','nosniff'); self.end_headers();self.wfile.write(body)
 def do_GET(self): self.dispatch()
 def do_POST(self): self.dispatch()
 def dispatch(self):
  if time.monotonic()>DEADLINE or self.headers.get('Host')!='127.0.0.1:4313' or self.headers.get('Sec-Fetch-Site')=='cross-site' or self.headers.get('Origin') not in [None,'http://127.0.0.1:4313']:
   self.send(403,b'Loopback same-origin only','text/plain');return
  if self.command=='GET' and self.path=='/':self.send(200,HTML,'text/html; charset=utf-8');return
  if self.command=='GET' and self.path=='/fixture.js':self.send(200,JS,'text/javascript');return
  if self.command=='GET' and self.path=='/approved-baseline.mp4':self.send(200,BASELINE.read_bytes(),'video/mp4');return
  if not (self.path in ['/producer','/style.css','/producer.css','/producer-room.js','/producer-input.js','/file-capture.js','/vendor/livekit-client.js','/api/ha/action'] or self.path.startswith(('/runtime/','/api/producer/'))):self.send(404,b'Not found','text/plain');return
  connection=http.client.HTTPConnection('127.0.0.1',4311,timeout=8)
  try:
   length=int(self.headers.get('Content-Length','0'));assert 0<=length<=1000000
   headers={k:v for k,v in self.headers.items() if k.lower() not in ['host','connection','origin','referer','content-length','accept-encoding']};headers['Host']='127.0.0.1:4311'
   if self.headers.get('Origin'):headers['Origin']='http://127.0.0.1:4311'
   connection.request(self.command,self.path,self.rfile.read(length) if length else None,headers)
   response=connection.getresponse();data=response.read();self.send_response(response.status)
   for k,v in response.getheaders():
    if k.lower() not in ['connection','transfer-encoding','content-length']:self.send_header(k,v)
   self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data)
  except (OSError,AssertionError):self.send(503,b'Approved EC2 tunnel is not ready','text/plain')
  finally:connection.close()
server=http.server.ThreadingHTTPServer(('127.0.0.1',4313),Handler);server.timeout=1
print('Bounded loopback fixture ready; no media session started',flush=True)
while time.monotonic()<DEADLINE:server.handle_request()
server.server_close()
