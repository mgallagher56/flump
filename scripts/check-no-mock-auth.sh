#!/usr/bin/env bash
# Fails if a mock-auth literal appears outside the allow-list, so the dev
# bypass cannot return silently. Run from anywhere: `bun run check:auth`.
set -euo pipefail

cd "$(dirname "$0")/.."

PATTERN='mock-session-token|dev_user_123|user_mock|mock_mcp_'

# Files (exact paths) and directory prefixes where the literals are allowed.
ALLOWED_FILES=(
  "apps/backend/src/auth/dev-bypass.verifier.ts"
  "apps/web/app/utils/auth.server.ts"
)
ALLOWED_PREFIXES=(
  "apps/mobile-companion/"
)

matches=""
while IFS= read -r file; do
  [ -z "$file" ] && continue
  allowed=0
  for f in "${ALLOWED_FILES[@]}"; do
    [ "$file" = "$f" ] && allowed=1
  done
  for p in "${ALLOWED_PREFIXES[@]}"; do
    case "$file" in "$p"*) allowed=1 ;; esac
  done
  case "$(basename "$file")" in
    *.test.* | *.spec.*) allowed=1 ;;
  esac
  if [ "$allowed" -eq 0 ]; then
    matches="${matches}$(grep -nE "$PATTERN" "$file" | sed "s|^|${file}:|")"$'\n'
  fi
done < <(grep -rlE "$PATTERN" apps packages \
  --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=build \
  --exclude-dir=coverage --exclude-dir=.react-router 2>/dev/null || true)

if [ -n "$matches" ]; then
  echo "Mock auth literals found outside the allow-list:" >&2
  printf '%s' "$matches" >&2
  echo "Allowed: ${ALLOWED_FILES[*]} ${ALLOWED_PREFIXES[*]} *.test.* *.spec.*" >&2
  exit 1
fi

echo "OK: no mock auth literals outside the allow-list."
