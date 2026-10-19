#!/bin/sh
set -eu
umask 077
ulimit -c 0
export HOME=/home/satellite XDG_CONFIG_HOME=/home/satellite/.config XDG_CACHE_HOME=/home/satellite/.cache
export XDG_RUNTIME_DIR=/run/satellite
export DISPLAY=:100 QT_QPA_PLATFORM=xcb
export PULSE_SERVER=unix:/run/satellite/pulse/native
export LD_LIBRARY_PATH=/opt/jupiter/sdk:/opt/jupiter/sdk/qt_libs/Qt/lib
export QT_PLUGIN_PATH=/opt/jupiter/sdk/qt_libs/Qt/plugins
export JUPITER_WORKER_DIAGNOSTICS=1
mkdir -p "$XDG_RUNTIME_DIR" "$XDG_CONFIG_HOME" "$XDG_CACHE_HOME" /run/jupiter-io-display
export XAUTHORITY=/run/jupiter-io-display/Xauthority
printf '[General]\nsystem.audio.type=default\n' > "$XDG_CONFIG_HOME/zoomus.conf"
cookie=$(od -An -N16 -tx1 /dev/urandom | tr -d ' \n')
xauth -f "$XAUTHORITY" add :100 . "$cookie" 2>/dev/null
Xvfb :100 -screen 0 1920x1080x24 -nolisten tcp -auth "$XAUTHORITY" >/run/satellite/display.log 2>&1 &
display_pid=$!
pulseaudio --daemonize=no --exit-idle-time=-1 --disable-shm=yes >/run/satellite/audio.log 2>&1 &
audio_pid=$!
worker_pid=
cleanup() {
 if [ -n "$worker_pid" ]; then kill -TERM "$worker_pid" 2>/dev/null || true; wait "$worker_pid" 2>/dev/null || true; fi
 kill "$audio_pid" "$display_pid" 2>/dev/null || true
 wait "$audio_pid" "$display_pid" 2>/dev/null || true
}
trap cleanup EXIT
trap 'exit 143' TERM INT
ready=0
while [ "$ready" -lt 50 ]; do
 if xdpyinfo >/dev/null 2>&1 && pactl info >/dev/null 2>&1; then break; fi
 ready=$((ready + 1)); sleep 0.1
done
xdpyinfo >/dev/null 2>&1
pactl info >/dev/null 2>&1
if [ "${1:-}" = --preflight ]; then
 /opt/jupiter/bridge-worker --preflight
 printf 'Isolated display/audio/SDK preflight passed; no SDK authentication or meeting join\n'
 exit 0
fi
# An image or stopped preflight container cannot join a meeting accidentally.
if [ "${JUPITER_ALLOW_MEETING_JOIN:-0}" != 1 ]; then
 printf 'Meeting joins are disabled for this prepared container\n' >&2
 exit 78
fi
/opt/jupiter/bridge-worker &
worker_pid=$!
set +e
wait "$worker_pid"
result=$?
worker_pid=
exit "$result"
