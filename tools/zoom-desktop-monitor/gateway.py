#!/usr/bin/env python3
import json
import os
import socket
import sys
from protocol import MAX_AUDIO, MAX_FRAME, parse_request


def run():
    parts = os.environ.get('SSH_ORIGINAL_COMMAND', '').split(' ')
    if len(parts) not in (2, 3) or parts[0] != 'desktop-return':
        raise ValueError('Invalid command')
    raw = sys.stdin.buffer.readline(4098)
    if len(raw) > 4096 or not raw.endswith(b'\n'):
        raise ValueError('Invalid request')
    body = json.loads(raw)
    request = {'action': parts[1], **({'sessionId': parts[2]} if len(parts) == 3 else {}), **body}
    # Never let stdin override the fixed command identity or action.
    if set(body) != {'start': {'joinUrl'}, 'audio': {'after'}}.get(parts[1], set()):
        raise ValueError('Invalid fields')
    parse_request(request)
    with socket.socket(socket.AF_UNIX) as connection:
        connection.settimeout(12)
        connection.connect('/run/jupiter-zoom-desktop/control.sock')
        connection.sendall(json.dumps(request).encode() + b'\n')
        with connection.makefile('rb') as stream:
            header = stream.readline(4097)
            if not header.endswith(b'\n') or len(header) > 4096:
                raise ValueError('Invalid header')
            metadata = json.loads(header)
            audio = parts[1] == 'audio'
            size = metadata.get('audioBytes' if audio else 'jpegBytes', 0)
            if type(size) is not int or not 0 <= size <= (MAX_AUDIO if audio else MAX_FRAME):
                raise ValueError('Invalid frame')
            data = stream.read(size)
            if len(data) != size:
                raise ValueError('Truncated frame')
            sys.stdout.buffer.write(header + data)


if __name__ == '__main__':
    try:
        run()
    except Exception:
        sys.stdout.write('{"error":"Desktop unavailable"}\n')
        raise SystemExit(1)
