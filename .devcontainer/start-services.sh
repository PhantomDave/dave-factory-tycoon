#!/usr/bin/env sh
set -eu

CONFIG="/workspaces/roblox-test/.devcontainer/supervisord.conf"
SOCKET="/tmp/devcontainer-supervisor.sock"
PIDFILE="/tmp/devcontainer-supervisord.pid"
LOGDIR="/tmp/devcontainer-supervisor"

mkdir -p "$LOGDIR"

if [ -f "$PIDFILE" ] && ! sudo -n kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then
	sudo -n rm -f "$PIDFILE" "$SOCKET"
fi

if [ -S "$SOCKET" ] && sudo -n supervisorctl -c "$CONFIG" status >/dev/null 2>&1; then
	echo "Reloading devcontainer services..."
	sudo -n supervisorctl -c "$CONFIG" reread >/dev/null
	sudo -n supervisorctl -c "$CONFIG" update >/dev/null
else
	echo "Starting devcontainer services..."
	sudo -n supervisord -c "$CONFIG"
fi

sudo -n supervisorctl -c "$CONFIG" status
