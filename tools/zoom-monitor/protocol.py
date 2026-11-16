"""Bounded one-meeting return protocol. No credentials or media are persisted."""
import re
from urllib.parse import urlsplit, parse_qs, urlencode, urlunsplit

ID = re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
MAX_SECONDS = 900
MAX_FRAME = 500_000


def session_id(value):
    if not isinstance(value, str) or not ID.fullmatch(value):
        raise ValueError('Invalid monitor session')
    return value


def join_target(value):
    if not isinstance(value, str) or len(value) > 2048:
        raise ValueError('Invalid Zoom join link')
    url = urlsplit(value)
    host = url.hostname or ''
    if (url.scheme != 'https' or url.username or url.password or url.port or
            not (host == 'zoom.us' or host.endswith('.zoom.us')) or
            not re.fullmatch(r'/j/\d{9,11}/?', url.path)):
        raise ValueError('Invalid Zoom join link')
    meeting = url.path.split('/')[2]
    passcode = parse_qs(url.query).get('pwd', [''])[0]
    # Use Zoom's own web client; no SDK raw recording permission is requested.
    query = {'pwd': passcode} if passcode else {}
    return urlunsplit(('https', host, '/wc/join/' + meeting, urlencode(query), ''))


def parse_request(value):
    if not isinstance(value, dict) or set(value) - {'action', 'sessionId', 'joinUrl', 'termsAccepted'}:
        raise ValueError('Invalid monitor request')
    action = value.get('action')
    if action not in ('start', 'status', 'frame', 'stop'):
        raise ValueError('Invalid monitor action')
    result = {'action': action, 'sessionId': session_id(value.get('sessionId'))}
    if action == 'start':
        result['target'] = join_target(value.get('joinUrl'))
        if type(value.get('termsAccepted', False)) is not bool:
            raise ValueError('Invalid consent')
        result['termsAccepted'] = value.get('termsAccepted', False)
    elif 'joinUrl' in value:
        raise ValueError('Unexpected join link')
    return result


def classify(text, has_leave):
    """A screenshot alone is never evidence that a meeting was joined."""
    value = text.lower()
    if any(term in value for term in ('complete the captcha', 'human verification required', 'verify you are human', 'i am human', 'i’m not a robot', "i'm not a robot")):
        return 'needs_attention'
    if 'by clicking' in value and 'you agree' in value:
        return 'needs_consent'
    if any(term in value for term in ('sign in to join', 'only authenticated', 'agree and continue', 'i agree', 'accept terms')):
        return 'needs_attention'
    if any(term in value for term in ('meeting has ended', 'meeting was ended', 'removed by the host', 'meeting id is not valid', 'invalid meeting id')):
        return 'ended'
    if any(term in value for term in ('host will let you in', 'waiting room', 'please wait, the meeting host will let you in')):
        return 'waiting_room'
    if any(term in value for term in ('waiting for the host', 'wait for the host to start', 'meeting has not started')):
        return 'waiting_for_host'
    return 'connected' if has_leave else 'joining'
