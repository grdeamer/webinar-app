"""A single attended Zoom desktop; media is never persisted."""
import re
from urllib.parse import urlsplit

MAX_FRAME = 500_000
MAX_SECONDS = 900
AUDIO_CHUNK = 48_000  # one second of mono 24 kHz signed 16-bit PCM
MAX_AUDIO = 4 * AUDIO_CHUNK
SESSION = re.compile(r'^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$')


def parse_request(value):
    if not isinstance(value, dict):
        raise ValueError('Invalid request')
    action = value.get('action')
    allowed = {'status': {'action'}, 'start': {'action', 'sessionId', 'joinUrl'},
               'frame': {'action', 'sessionId'}, 'audio': {'action', 'sessionId', 'after'}, 'stop': {'action', 'sessionId'}}
    if action not in allowed or set(value) != allowed[action]:
        raise ValueError('Invalid fields')
    if action != 'status' and (not isinstance(value['sessionId'], str) or not SESSION.fullmatch(value['sessionId'])):
        raise ValueError('Invalid session')
    if action == 'audio' and (type(value['after']) is not int or not 0 <= value['after'] <= MAX_SECONDS):
        raise ValueError('Invalid audio cursor')
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
