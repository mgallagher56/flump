#!/usr/bin/env bash
# smoke.sh: HTTP smoke test for the three Flump services (runbook G8).
#
# Usage:
#   bash scripts/ops/smoke.sh production
#   MARKETING_URL=https://<marketing-domain> bash scripts/ops/smoke.sh production
#   bash scripts/ops/smoke.sh local
#   BACKEND_URL=... WEB_URL=... MARKETING_URL=... bash scripts/ops/smoke.sh env
#   EXPECTED_COMMIT=<sha or 7-char prefix> bash scripts/ops/smoke.sh production
#
# Targets: production | staging | local | env. BACKEND_URL, WEB_URL and MARKETING_URL always
# override the target's defaults. production has no built-in marketing URL (not recorded
# anywhere in the repo): set MARKETING_URL. staging has no defaults: set all three.
# Prints PASS/FAIL lines with the path and status only (never bodies). Exit 1 if any check
# fails (404, wrong header, connection failure), 2 on usage errors.
set -euo pipefail

target="${1:-}"
case "$target" in
  production)
    BACKEND_URL="${BACKEND_URL:-https://backend-production-184b.up.railway.app}"
    WEB_URL="${WEB_URL:-https://web-production-845e6c.up.railway.app}"
    ;;
  local)
    BACKEND_URL="${BACKEND_URL:-http://localhost:4000}"
    WEB_URL="${WEB_URL:-http://localhost:5173}"
    MARKETING_URL="${MARKETING_URL:-http://localhost:3001}"
    ;;
  staging | env) ;;
  *)
    echo "usage: bash scripts/ops/smoke.sh <production|staging|local|env>" >&2
    exit 2
    ;;
esac

missing=0
for name in BACKEND_URL WEB_URL MARKETING_URL; do
  if [ -z "${!name:-}" ]; then
    echo "ERROR: $name is not set for target '$target' (set it in the environment)" >&2
    missing=1
  fi
done
[ "$missing" -eq 0 ] || exit 2

BACKEND_URL="${BACKEND_URL%/}"
WEB_URL="${WEB_URL%/}"
MARKETING_URL="${MARKETING_URL%/}"

workdir="$(mktemp -d)"
trap 'rm -rf "$workdir"' EXIT
failures=0

pass() { echo "PASS $1"; }
fail() {
  echo "FAIL $1"
  failures=$((failures + 1))
}

# fetch <base> <path>: sets STATUS (000 on connection failure); headers of the final
# response go to $workdir/headers, the body to $workdir/body. Follows up to 3 redirects.
fetch() {
  local base="$1" path="$2"
  : >"$workdir/headers"
  : >"$workdir/body"
  STATUS="$(curl -sS -L --max-redirs 3 --connect-timeout 5 --max-time 20 \
    -D "$workdir/headers.all" -o "$workdir/body" -w '%{http_code}' "$base$path" 2>/dev/null)" || STATUS="000"
  # Keep only the last header block (the final response after any redirects).
  if [ -s "$workdir/headers.all" ]; then
    tr -d '\r' <"$workdir/headers.all" | awk 'BEGIN { RS = "" } { last = $0 } END { print last }' \
      >"$workdir/headers"
  fi
  rm -f "$workdir/headers.all"
}

# expect_200 <service> <base> <path>
expect_200() {
  fetch "$2" "$3"
  if [ "$STATUS" = "200" ]; then pass "$1 $3 ($STATUS)"; else fail "$1 $3 (status $STATUS, want 200)"; fi
}

# Header and body checks reuse the last fetch.
expect_noindex() {
  if grep -iE '^x-robots-tag:.*noindex' "$workdir/headers" >/dev/null; then
    pass "$1 $2 X-Robots-Tag noindex"
  else
    fail "$1 $2 X-Robots-Tag noindex missing"
  fi
}

check_robots() {
  fetch "$2" /robots.txt
  if [ "$STATUS" = "200" ] && grep -E '^Disallow:[[:space:]]*/[[:space:]]*$' "$workdir/body" >/dev/null; then
    pass "$1 /robots.txt Disallow: /"
  else
    fail "$1 /robots.txt (status $STATUS) lacks Disallow: /"
  fi
}

echo "smoke: target=$target"

# Backend
expect_200 backend "$BACKEND_URL" /
fetch "$BACKEND_URL" /health/ready
if [ "$STATUS" != "200" ]; then
  fail "backend /health/ready (status $STATUS, want 200)"
elif ! grep -F '"commit"' "$workdir/body" >/dev/null; then
  fail "backend /health/ready body has no commit field"
else
  pass "backend /health/ready (200, has commit)"
  if [ -n "${EXPECTED_COMMIT:-}" ]; then
    body_commit="$(sed -n 's/.*"commit"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$workdir/body" | head -n 1)"
    # The endpoint reports a short SHA; accept either side being a prefix of the other.
    if [ -n "$body_commit" ] && { [[ "$body_commit" == "$EXPECTED_COMMIT"* ]] || [[ "$EXPECTED_COMMIT" == "$body_commit"* ]]; }; then
      pass "backend commit matches EXPECTED_COMMIT"
    else
      fail "backend commit does not match EXPECTED_COMMIT"
    fi
  fi
fi

# Web
expect_200 web "$WEB_URL" /healthz
expect_200 web "$WEB_URL" /ping
fetch "$WEB_URL" /
expect_noindex web /
check_robots web "$WEB_URL"

# Marketing
expect_200 marketing "$MARKETING_URL" /healthz
fetch "$MARKETING_URL" /
if [ "$STATUS" = "200" ]; then pass "marketing / ($STATUS)"; else fail "marketing / (status $STATUS, want 200)"; fi
expect_noindex marketing /
check_robots marketing "$MARKETING_URL"

if [ "$failures" -gt 0 ]; then
  echo "smoke: $failures check(s) FAILED"
  exit 1
fi
echo "smoke: all checks passed"
