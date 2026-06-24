#!/bin/bash
# Aadyadvait — local-only static server.
# Double-click in Finder, or run from terminal: ./start.command
# Bound to 127.0.0.1 only — not reachable from your home network or the internet.

cd "$(dirname "$0")"

PORT=8000
URL="http://localhost:${PORT}/"

# Open the browser shortly after the server starts.
( sleep 1 && open "$URL" ) &

cat <<EOF
================================================
  Aadyadvait — local-only vault
  URL:  ${URL}
  Bind: 127.0.0.1 (loopback only)
  Stop: Ctrl+C
================================================
EOF

exec python3 -m http.server "$PORT" --bind 127.0.0.1
