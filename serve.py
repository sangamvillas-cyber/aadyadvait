#!/usr/bin/env python3
"""
Local-only static server for the Mishra Family vault.

Identical to `python3 -m http.server` except:
- Bound to 127.0.0.1 only (never reachable from the network)
- Anchored to the directory containing this file, regardless of where it's launched from
- Sends aggressive no-cache headers so stale HTML / JS / JSON never sticks in the browser
- Adds a few cheap defence-in-depth headers (nosniff, frame-deny, no-referrer)
"""
import http.server
import os
import socketserver
import sys

DIRECTORY = os.path.dirname(os.path.abspath(__file__))
DEFAULT_PORT = 8000
BIND = "127.0.0.1"


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # No-cache: the whole point of this wrapper. Browsers must revalidate every
        # response, so editing a file is visible on the next refresh — no more
        # stale auth.html / auth-webauthn.html flicker.
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        # Defence in depth — cheap and harmless on a local site.
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Referrer-Policy", "no-referrer")
        super().end_headers()


class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_PORT
    with ReusableTCPServer((BIND, port), Handler) as httpd:
        print(f"Aadyadvait — local-only vault")
        print(f"  URL:  http://localhost:{port}/")
        print(f"  Bind: {BIND} (loopback only)")
        print(f"  Dir:  {DIRECTORY}")
        print(f"  Headers: no-cache, nosniff, frame-deny, no-referrer")
        print(f"  Stop: Ctrl+C")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nStopped.")


if __name__ == "__main__":
    main()
