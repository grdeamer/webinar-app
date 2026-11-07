# Producer engine boot activation

The producer cannot be a direct `multi-user.target` dependency while its maintenance preflight waits for APT: Ubuntu orders APT after cloud-final, which itself waits for multi-user. Systemd drops the producer start job to break that cycle.

The boot timer activates the existing producer service without making the boot target wait for it. The maintenance check, relay dependencies, Chromium sandbox, recording-off configuration, guest deadlines, and independent AWS shutdown are unchanged. This is a one-shot boot activation, not a restart loop or a paid instance launcher.

`install-boot-timer.py` runs as root only on a marked Jupiter producer host. It preserves activation metadata, verifies the systemd units, removes the direct boot-target enablement, and enables the timer. It does not change credentials or provision AWS resources. Apply only within an approved maintenance/validation window.

Validated on the existing EC2 host with a real stop/start cycle on November 7, 2026. The service started automatically and the live room connected without a separate Connect action.
