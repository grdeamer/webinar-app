"""A single attended Zoom desktop; media is never persisted."""
import re
from urllib.parse import urlsplit

MAX_FRAME = 500_000
MAX_SECONDS = 900
SESSION = re.compile(r'^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$')


def parse_request(value):
    if not isinstance(value, dict):
        raise ValueError('Invalid request')
    action = value.get('action')
    allowed = {'status': {'action'}, 'start': {'action', 'sessionId', 'joinUrl'},
               'frame': {'action', 'sessionId'}, 'stop': {'action', 'sessionId'}}
    if action not in allowed or set(value) != allowed[action]:
        raise ValueError('Invalid fields')
    if action != 'status' and (not isinstance(value['sessionId'], str) or not SESSION.fullmatch(value['sessionId'])):
        raise ValueError('Invalid session')
    result = dict(value)
    if action == 'start':
        link = value['joinUrl']
        if not isinstance(link, str) or len(link) > 2048:
            raise ValueError('Invalid meeting')
        url = urlsplit(link)
        host = url.hostname or ''
        if (url.scheme != 'https' or url.username or url.password or url.port or
                not (host == 'zoom.us' or host.endswith('.zoom.us')) or
                not re.fullmatch(r'/j/\d{9,11}/?', url.path)):
            raise ValueError('Invalid meeting')
        # The native client is joined interactively through the private console.
        # Retain no embedded passcode, authorization URL or meeting credentials.
        result.pop('joinUrl')
        result['meetingId'] = url.path.split('/')[2]
    return result
