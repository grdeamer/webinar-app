"""Generate a private, boot-scoped X11 cookie; never print or persist media."""
from pathlib import Path
import secrets
import subprocess

path = Path('/run/jupiter-io-display/Xauthority')
path.touch(mode=0o600, exist_ok=True)
path.chmod(0o600)
subprocess.run(['xauth', '-f', str(path), 'add', ':100', '.', secrets.token_hex(16)], check=True)
