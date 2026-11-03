#!/usr/bin/env bash
# Post-deploy smoke test: liveness plus the security posture that should never regress.
# usage: scripts/smoke.sh https://myuzik.vercel.app https://api.myuzik.app
set -uo pipefail
web="${1:?frontend URL}"; api="${2:?backend URL}"; failed=0

check() { # name, expected, actual
  if [[ "$3" == "$2" ]]; then echo "ok   $1"; else echo "FAIL $1 (expected $2, got $3)"; failed=1; fi
}
status() { curl -s -o /dev/null -w '%{http_code}' "$@"; }

check "api /health" 200 "$(status "$api/health")"
check "sign-in page" 200 "$(status "$web/sign-in")"
check "signed-out redirect" 307 "$(status "$web/history")"
check "nonce CSP present" yes "$(curl -sI "$web/sign-in" | grep -qi "^content-security-policy:.*'nonce-" && echo yes || echo no)"
check "proxy blocks token endpoints" 404 "$(status -X POST "$web/api/proxy/auth%2Flogin")"
check "auth rejects cross-origin" 403 "$(status -X POST -H 'Origin: https://evil.example' -H 'Content-Type: application/json' -d '{}' "$web/api/auth/login")"
check "api requires auth" 401 "$(status "$api/api/v1/history")"
check "websocket rejects missing ticket" 403 "$(status -H "Origin: $web" -H 'Connection: Upgrade' -H 'Upgrade: websocket' -H 'Sec-WebSocket-Version: 13' -H 'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==' "$api/ws/listen")"
exit "$failed"
