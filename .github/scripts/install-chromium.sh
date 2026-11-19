#!/usr/bin/env bash
# Gets Chromium ready for the Storybook and E2E jobs (E41 P1, owner decision 13, option A).
#
# Usage: install-chromium.sh <cache-hit>   (run from the app directory that has playwright)
#   cache-hit "true"  the browser cache restored ~/.cache/ms-playwright.
#                     Skip the system package step if every library the cached browsers link
#                     against is already on the runner; otherwise install the packages.
#   anything else     download the browser and its system packages.
#
# Downloads can fail when the Ubuntu package mirror is down, so each install is tried up to three
# times. After any install the browsers are checked again, and the script fails if they are still
# not ready: a retry never turns a real failure into a pass.
set -euo pipefail

BROWSER_DIR="${PLAYWRIGHT_BROWSERS_PATH:-$HOME/.cache/ms-playwright}"
ATTEMPTS=3

retry() {
  local attempt=1
  until "$@"; do
    if [ "$attempt" -ge "$ATTEMPTS" ]; then
      echo "::error::'$*' failed after $attempt attempts"
      return 1
    fi
    local wait=$((attempt * 20))
    echo "::warning::'$*' failed (attempt $attempt of $ATTEMPTS); retrying in ${wait}s"
    sleep "$wait"
    attempt=$((attempt + 1))
  done
}

# Prints the browser executables Playwright cached (full Chromium and the headless shell).
browser_binaries() {
  find "$BROWSER_DIR" -type f \( -name chrome -o -name headless_shell \) -perm -u+x 2>/dev/null
}

# True when at least one browser is cached and every shared library it needs resolves.
browsers_ready() {
  local found=0 bin missing
  while IFS= read -r bin; do
    found=1
    missing="$(ldd "$bin" 2>&1 | grep 'not found' || true)"
    if [ -n "$missing" ]; then
      echo "Missing libraries for $bin:"
      echo "$missing"
      return 1
    fi
  done < <(browser_binaries)
  [ "$found" -eq 1 ]
}

if [ "${1:-}" = "true" ]; then
  if browsers_ready; then
    echo "Browser cache hit and all system libraries present: skipping install-deps."
    exit 0
  fi
  echo "Browser cache hit but the browsers are not ready: installing system packages."
  retry bunx playwright install-deps chromium
  # The cache can hold a partial download; fetch whatever is missing (no-op when complete).
  retry bunx playwright install chromium
else
  retry bunx playwright install --with-deps chromium
fi

if ! browsers_ready; then
  echo "::error::Chromium is not ready after install"
  exit 1
fi
