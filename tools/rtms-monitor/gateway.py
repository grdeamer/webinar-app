#!/usr/bin/env python3
"""Forced-command bridge. Event payload and meeting ID travel through stdin."""
import json
import os
import socket
import sys
from protocol import MAX_FRAME, MAX_REQUEST, identity


def run(command):
    parts = command.split(' ')
    if parts == ['rtms-return', 'event']:
        action = 'event'
        request = {'action': action}
    elif len(parts) == 3 and parts[0] == 'rtms-return' and parts[1] in ('arm', 'frame', 'stop'):
        action = parts[1]
        request = {'action': action, 'sessionId': identity(parts[2])}
    else:
        raise ValueError('Invalid RTMS command')
    raw = sys.stdin.buffer.readline(MAX_REQUEST + 2)
    if len(raw) > MAX_REQUEST or not raw.endswith(b'\n'):
        raise ValueError('Invalid RTMS request')
    body = json.loads(raw)
    fields = {'event': {'raw', 'timestamp', 'signature'}, 'arm': {'meetingId'}, 'frame': {'kind'}, 'stop': set()}
    if not isinstance(body, dict) or set(body) != fields[action]:
        raise ValueError('Unexpected RTMS fields')
    request.update(body)
    with socket.socket(socket.AF_UNIX) as connection:
        connection.settimeout(8)
        connection.connect('/run/jupiter-rtms-monitor/control.sock')
        connection.sendall(json.dumps(request).encode() + b'\n')
        with connection.makefile('rb') as source:
            header = source.readline(4097)
            if len(header) > 4096 or not header.endswith(b'\n'):
                raise ValueError('Invalid header')
            length = json.loads(header).get('jpegBytes', 0)
            if type(length) is not int or not 0 <= length <= MAX_FRAME:
                raise ValueError('Invalid frame size')
            frame = source.read(length)
            if len(frame) != length:
                raise ValueError('Truncated frame')
            sys.stdout.buffer.write(header + frame)


if __name__ == '__main__':
    try:
        run(os.environ.get('SSH_ORIGINAL_COMMAND', ''))
    except Exception:
        sys.stdout.write('{"error":"RTMS receiver unavailable"}\n')
        raise SystemExit(1)
