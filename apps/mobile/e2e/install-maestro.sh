#!/usr/bin/env bash
# Installs the Maestro CLI for the Android e2e job (E12 S2c), at a pinned version, checked against
# a SHA-256 committed here rather than one fetched from the same release as the binary.
#
#   bash apps/mobile/e2e/install-maestro.sh <dest-dir> [local-zip]
#
# With a local zip it skips the download (the tests use this to prove a mismatch fails).
# To update: pick a release at least 7 days old, then copy the `digest` of maestro.zip from
#   gh api repos/mobile-dev-inc/Maestro/releases/tags/cli-<version>
# Maestro is not tracked by Renovate: a version bump also needs this checksum, which Renovate cannot write.
set -euo pipefail

MAESTRO_VERSION="2.12.1"
MAESTRO_SHA256="54dbb0716425626604973cbb374c585ca30272375d9ce15177a1152765ddd9d7"

# No analytics or usage upload from CI; Maestro Cloud is never used.
export MAESTRO_CLI_NO_ANALYTICS=1
export MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED=true

dest="${1:?usage: install-maestro.sh <dest-dir> [local-zip]}"
zip="${2:-}"
mkdir -p "$dest"
if [ -z "$zip" ]; then
  zip="$dest/maestro.zip"
  curl -fsSL -o "$zip" \
    "https://github.com/mobile-dev-inc/Maestro/releases/download/cli-${MAESTRO_VERSION}/maestro.zip"
fi

if command -v sha256sum >/dev/null 2>&1; then
  actual=$(sha256sum "$zip" | cut -d' ' -f1)
else
  actual=$(shasum -a 256 "$zip" | cut -d' ' -f1)
fi
if [ "$actual" != "$MAESTRO_SHA256" ]; then
  echo "Maestro ${MAESTRO_VERSION}: the download does not match the pinned SHA-256; refusing to install." >&2
  exit 1
fi

unzip -q -o "$zip" -d "$dest"
echo "Maestro ready: $dest/maestro/bin/maestro (${MAESTRO_VERSION})"
