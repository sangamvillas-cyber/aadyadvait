#!/bin/bash
# Aadyadvait — local-only static server.
# Double-click in Finder, or run from terminal: ./start.command
# Bound to 127.0.0.1 only — not reachable from your home network or the internet.
# Uses serve.py which adds no-cache headers so stale HTML never gets stuck in the browser.

cd "$(dirname "$0")"

PORT=8000
URL="http://localhost:${PORT}/"

# If port is in use, kill the holder (almost always a stale Python from a previous run).
HOLDER="$(lsof -ti :"$PORT" 2>/dev/null)"
if [ -n "$HOLDER" ]; then
  echo "Port ${PORT} held by PID(s): $HOLDER — killing."
  kill -9 $HOLDER 2>/dev/null
  sleep 0.4
fi

# Open the browser shortly after the server starts.
( sleep 1 && open "$URL" ) &

exec /usr/bin/python3 "$(dirname "$0")/serve.py" "$PORT"
