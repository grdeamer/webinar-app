"""Bounded RTMS qualification protocol. No credentials or media persisted."""
import base64
import hashlib
import hmac
import json
import re
import time
from urllib.parse import urlsplit

MAX_FRAME = 500_000
MAX_REQUEST = 65_536
MAX_SECONDS = 900
IDENTITY = re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')


def identity(value):
    if not isinstance(value, str) or not IDENTITY.fullmatch(value):
        raise ValueError('Invalid session')
    return value


def zoom_socket(value):
    if not isinstance(value, str) or len(value) > 4096:
        raise ValueError('Invalid media endpoint')
    for candidate in value.split(','):
        url = urlsplit(candidate.strip())
        host = url.hostname or ''
        if (url.scheme == 'wss' and host.endswith('.zoom.us') and
                not url.username and not url.password and url.port in (None, 443) and not url.fragment):
            return candidate.strip()
    raise ValueError('No authorized Zoom WebSocket endpoint')


def verify_webhook(raw, timestamp, signature, secret, now=None):
    if not secret or not isinstance(raw, str) or len(raw.encode()) > MAX_REQUEST:
        raise ValueError('Invalid webhook')
    if not isinstance(timestamp, str) or not timestamp.isdigit() or abs((now or time.time()) - int(timestamp)) > 300:
        raise ValueError('Expired webhook')
    expected = 'v0=' + hmac.new(secret.encode(), f'v0:{timestamp}:{raw}'.encode(), hashlib.sha256).hexdigest()
    if not isinstance(signature, str) or not hmac.compare_digest(expected, signature):
        raise ValueError('Invalid webhook signature')
    value = json.loads(raw)
    if not isinstance(value, dict):
        raise ValueError('Invalid webhook')
    return value


def stream_signature(client_id, secret, meeting_uuid, stream_id):
    return hmac.new(secret.encode(), f'{client_id},{meeting_uuid},{stream_id}'.encode(), hashlib.sha256).hexdigest()


def picture(message, media):
    if message.get('msg_type') != (15 if media == 'video' else 16):
        return None
    content = message.get('content', {})
    encoded = content.get('data')
    if not isinstance(encoded, str) or len(encoded) > (MAX_FRAME * 4 // 3 + 4):
        raise ValueError('Oversized media')
    data = base64.b64decode(encoded, validate=True)
    if not 4 <= len(data) <= MAX_FRAME or not data.startswith(b'\xff\xd8') or not data.endswith(b'\xff\xd9'):
        raise ValueError('Unsupported media')
    if 'length' in content and content['length'] != len(data):
        raise ValueError('Invalid media size')
    return data


def media_handshake(meeting_uuid, stream_id, signature, media):
    return {'msg_type': 3, 'protocol_version': 2, 'sequence': 1,
            'meeting_uuid': meeting_uuid, 'rtms_stream_id': stream_id,
            'signature': signature, 'media_type': 2 if media == 'video' else 4,
            'media_params': {media if media == 'video' else 'deskshare': {
                'content_type': 3, 'codec': 5, 'resolution': 2, 'fps': 2 if media == 'video' else 1}}}
