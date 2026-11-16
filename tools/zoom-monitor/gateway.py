#!/usr/bin/env python3
"""Fixed SSH bridge; only a UUID-scoped monitor request, no shell or arbitrary URL fetch."""
import json
import os
import socket
import sys
from protocol import MAX_FRAME, parse_request, session_id


def read_exact(source, size):
    chunks = bytearray()
    while len(chunks) < size:
        part = source.read(size - len(chunks))
        if not part:
            raise ValueError('Truncated return frame')
        chunks.extend(part)
    return bytes(chunks)


def run(command):
    parts = command.split(' ')
    if len(parts) != 3 or parts[0] != 'meeting-return' or parts[1] not in ('start', 'status', 'frame', 'stop'):
        raise ValueError('Invalid return command')
    action, identity = parts[1], session_id(parts[2])
    data = {'action': action, 'sessionId': identity}
    if action == 'start':
        # The join link travels through private SSH stdin, never process arguments.
        body = sys.stdin.buffer.readline(4097)
        if len(body) > 4096 or not body.endswith(b'\n'):
            raise ValueError('Invalid start request')
        value = json.loads(body)
        if not isinstance(value, dict) or set(value) != {'joinUrl'}:
            raise ValueError('Invalid start fields')
        data['joinUrl'] = value['joinUrl']
    parse_request(data)
    with socket.socket(socket.AF_UNIX) as connection:
        connection.settimeout(8)
        connection.connect('/run/jupiter-zoom-monitor/control.sock')
        connection.sendall(json.dumps(data).encode() + b'\n')
        with connection.makefile('rb') as source:
            header = source.readline(4097)
            if len(header) > 4096 or not header.endswith(b'\n'):
                raise ValueError('Invalid return header')
            result = json.loads(header)
            length = result.get('jpegBytes', 0)
            if type(length) is not int or not 0 <= length <= MAX_FRAME:
                raise ValueError('Invalid return size')
            picture = read_exact(source, length)
            if picture and not (picture.startswith(b'\xff\xd8') and picture.endswith(b'\xff\xd9')):
                raise ValueError('Invalid JPEG')
            sys.stdout.buffer.write(header + picture)
            sys.stdout.buffer.flush()


if __name__ == '__main__':
    try:
        run(os.environ.get('SSH_ORIGINAL_COMMAND', ''))
    except Exception:
        # No URLs, passcodes, page text or stack traces in SSH output.
        sys.stdout.write('{"error":"Server monitor unavailable"}\n')
        raise SystemExit(1)
