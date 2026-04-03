#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
WORKSPACE_DIR=${DEVCONTAINER_WORKSPACE_DIR:-$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)}
CONFIG=${DEVCONTAINER_CONFIG:-$SCRIPT_DIR/supervisord.conf}
SOCKET="/tmp/devcontainer-supervisor.sock"
PIDFILE="/tmp/devcontainer-supervisord.pid"
LOGDIR="/tmp/devcontainer-supervisor"

mkdir -p "$LOGDIR"

if [ -f "$PIDFILE" ] && ! sudo -n kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then
	sudo -n rm -f "$PIDFILE" "$SOCKET"
fi

if [ -S "$SOCKET" ] && sudo -n env WORKSPACE_DIR="$WORKSPACE_DIR" supervisorctl -c "$CONFIG" status >/dev/null 2>&1; then
	echo "Reloading devcontainer services..."
	sudo -n env WORKSPACE_DIR="$WORKSPACE_DIR" supervisorctl -c "$CONFIG" reread >/dev/null 2>&1 || true
	sudo -n env WORKSPACE_DIR="$WORKSPACE_DIR" supervisorctl -c "$CONFIG" update >/dev/null 2>&1 || true
else
	echo "Starting devcontainer services..."
	sudo -n env WORKSPACE_DIR="$WORKSPACE_DIR" supervisord -c "$CONFIG"
fi

sudo -n env WORKSPACE_DIR="$WORKSPACE_DIR" supervisorctl -c "$CONFIG" status
