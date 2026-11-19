# Attended native Zoom desktop qualification

This is a separate implementation from the web-client monitor Zoom rejected on
16 November. It launches the official Zoom Linux desktop app on a private X11
desktop. An operator uses a localhost-only noVNC console through the existing
authenticated SSH connection to join, handle consent/admission, and arrange the
meeting. There is no SDK raw-media subscription, web-bot join, detection bypass,
CAPTCHA handling, automated retry, or automatic agreement acceptance.

The intended qualification is one existing EC2 host, a separately approved $1
allowance and an independently verified 30-minute cloud stop. The service starts
idle, is not enabled at boot, and launches a desktop only after an administrator
explicitly starts the test. The unit exits after stop, failure or expiry;
systemd's control-group cleanup also terminates detached vendor subprocesses.
Another test requires an explicit service start. Fifteen minutes is a hard desktop deadline. Any
authenticated viewer refreshes the shared 30-second lease; closing one viewer
does not disconnect the others. A 1.5 GB whole-host traffic delta also expires
the desktop. Installation traffic occurs before the monitor starts.

`PrivateDevices` removes camera/sound devices. An isolated PulseAudio server
provides a muted silent microphone source, with no hardware input. The operator
must also verify Zoom camera off and microphone disconnected/muted before
calling the test qualified. There is no recording or captured audio. Zoom's
HOME, preferences, caches, logs, X11 cookie and console password are private
ephemeral `/run` data and are removed on stop. Only a latest JPEG is returned.

Install `sudo bash install.sh --install`. The installer adds the official Zoom
Debian package and standard Ubuntu desktop/console dependencies. It preserves
the existing forced-command gateway and adds only the `desktop-return` command
family. No SSH key, inbound firewall rule, instance, public VNC endpoint or
public HTTP service is created. Interactive VNC/WebSocket ports 5908/6088 bind
only to localhost. Use a temporary SSH forward for qualification and stop it
afterward; never publish the private console through Jupiter or another proxy.

Enable `JUPITER_IO_DESKTOP_MONITOR_ENABLED=true` in the existing Vercel project
only after verifying the idle service. The first multiview tile offers **Server
· Zoom desktop**. **Start server desktop** creates a desktop, not a confirmed
meeting join. Its status deliberately says **Live server desktop · verify the
Zoom meeting view**. An administrator on another computer can open
`/admin/jupiter-io/server-return` to attach to the same desktop, without sharing
a meeting passcode or session identifier in the URL. Media endpoints remain
administrator-only and same-origin controls remain enforced.

Qualification must verify actual Zoom admission, camera/mic off, changing
meeting content, presentation/participants layout, separate viewer access,
and cleanup. A live server desktop image or process counter alone does not
prove Zoom meeting reception. Stop the desktop and service, verify child
processes and listeners gone, close the SSH forward, stop EC2 and verify stopped.

Local checks: `python3 -m unittest -v test_desktop.py` from this directory.
These tests do not qualify the native app, X11 rendering, graphics drivers,
permissions, meeting admission or real media. Record those after the live run.
