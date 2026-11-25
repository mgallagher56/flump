#!/usr/bin/env bash
# Runs every Maestro flow on the booted Android emulator, once in light and once in dark (E12 S2c).
# Called by CI's `🤖 Mobile e2e (Android)` job inside the emulator action.
#
#   bash apps/mobile/e2e/run-android-flows.sh <debug-apk> <output-dir>
#
# Flake policy: no retries. A failed flow fails the job; screenshots and Maestro's logs are in
# <output-dir> (uploaded as an artifact) to read why.
set -euo pipefail

apk="${1:?usage: run-android-flows.sh <debug-apk> <output-dir>}"
out="${2:?usage: run-android-flows.sh <debug-apk> <output-dir>}"
flows="$(cd "$(dirname "$0")" && pwd)/flows"

export MAESTRO_CLI_NO_ANALYTICS=1
export MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED=true

adb install -r "$apk"
# The debug build loads its JavaScript from Metro on the runner.
adb reverse tcp:8081 tcp:8081

mkdir -p "$out"
for theme in light dark; do
  if [ "$theme" = dark ]; then adb shell cmd uimode night yes; else adb shell cmd uimode night no; fi
  mkdir -p "$out/$theme"
  # takeScreenshot writes to the working directory.
  (cd "$out/$theme" && maestro test --format junit --output "$out/$theme/report.xml" \
    --test-output-dir "$out/$theme" -e THEME="$theme" "$flows")
  # A screenshot that was not written is a failure, not a silent gap in the artifact.
  for shot in welcome engine-check sign-in signed-in sign-in-denied not-invited signed-out session-ended; do
    if [ -z "$(find "$out/$theme" -name "${shot}-${theme}.png" -print -quit)" ]; then
      echo "Missing screenshot ${shot}-${theme}.png" >&2
      exit 1
    fi
  done
done
