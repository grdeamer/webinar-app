"""Receive short-lived SDK credentials over stdin, never Podman env/argv/config."""
import json
import os
import sys

KEYS = {'ZOOM_SDK_JWT', 'ZOOM_MEETING_ID', 'ZOOM_MEETING_PASSCODE', 'ZOOM_DISPLAY_NAME',
        'ZOOM_PUBLISH_MODE', 'ZOOM_VIDEO_QUALITY', 'ZOOM_VIDEO_ASPECT', 'ZOOM_ROOM_ID', 'ZOOM_RELAY_ROOT'}

def validate(data):
    if not isinstance(data, dict) or set(data) - KEYS:
        raise ValueError('Invalid runtime configuration')
    if any(not isinstance(value, str) or '\0' in value for value in data.values()):
        raise ValueError('Invalid runtime value')
    if not all(data.get(key) for key in ('ZOOM_SDK_JWT', 'ZOOM_MEETING_ID', 'ZOOM_ROOM_ID')):
        raise ValueError('Missing runtime configuration')
    return data

if __name__ == '__main__':
    if sys.argv[1:] == ['--preflight']:
        os.execv('/opt/jupiter/entrypoint.sh', ['/opt/jupiter/entrypoint.sh', '--preflight'])
    try:
        raw = sys.stdin.buffer.readline(32769)
        if len(raw) > 32768:
            raise ValueError('Configuration too large')
        data = validate(json.loads(raw))
    except (ValueError, TypeError):
        print('Container runtime configuration rejected', file=sys.stderr)
        sys.exit(78)
    os.environ.update(data)
    os.environ['JUPITER_ALLOW_MEETING_JOIN'] = '1'
    os.execv('/opt/jupiter/entrypoint.sh', ['/opt/jupiter/entrypoint.sh', '--live'])
