#!/usr/bin/python3
"""Socket-activated, bounded converter. Inputs and PDFs exist only in /run tmpfs."""
import json, os, pathlib, shutil, socket, subprocess, tempfile, signal
MAX = 50 * 1024 * 1024
def terminate(_signal, _frame):
    raise SystemExit()
signal.signal(signal.SIGTERM, terminate)
server = socket.socket(fileno=3)
while True:
    connection, _ = server.accept()
    job = None
    try:
        connection.settimeout(30)
        stream = connection.makefile('rb')
        line = stream.readline(2049)
        if len(line) > 2048: raise ValueError()
        header = json.loads(line)
        name, size = header['name'], header['bytes']
        extension = 'pptx' if name.lower().endswith('.pptx') else 'ppt' if name.lower().endswith('.ppt') else ''
        if not extension or type(size) is not int or not 0 < size <= MAX: raise ValueError()
        job = pathlib.Path(tempfile.mkdtemp(prefix='deck-', dir='/run/jupiter-converter'))
        source = job / ('input.' + extension)
        with source.open('wb') as output:
            remaining = size
            while remaining:
                chunk = stream.read(min(remaining, 65536))
                if not chunk: raise ValueError()
                output.write(chunk); remaining -= len(chunk)
        subprocess.run(['/usr/local/sbin/jupiter-convert-presentation', job.name, extension], check=True, timeout=70, stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        pdf = job / 'input.pdf'
        if not 5 <= pdf.stat().st_size <= MAX: raise ValueError()
        with os.fdopen(os.open(pdf, os.O_RDONLY | os.O_NOFOLLOW), 'rb') as result:
            content = result.read(MAX + 1)
        if len(content) > MAX: raise ValueError()
        if not content.startswith(b'%PDF-'): raise ValueError()
        connection.sendall(json.dumps({'bytes':len(content)}).encode()+b'\n'+content)
    except Exception:
        try: connection.sendall(b'{"error":"PowerPoint conversion failed or timed out"}\n')
        except OSError: pass
    finally:
        if job:
            try: subprocess.run(['systemctl', 'stop', 'jupiter-ppt-'+job.name], timeout=5, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            except Exception: pass
            shutil.rmtree(job, ignore_errors=True)
        connection.close()
