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
app_id=app.flump.mobile

# Stops the app and waits until Android has destroyed its screens. Switching the theme while a
# screen is live makes Android recreate it; a flow's clearState in that window once left Android's
# delayed task removal killing the freshly launched app (CI run 45649031045, dark not-invited: a
# black screen for 3 minutes). Not a retry: if the screens are still there after 10 s, the run fails.
stop_app_and_settle() {
  adb shell am force-stop "$app_id"
  # SETTLE_TRIES is for the script's own test only; CI uses the default.
  for _ in $(seq 1 "${SETTLE_TRIES:-20}"); do
    if ! adb shell dumpsys activity activities | grep -q "ActivityRecord{[^}]* ${app_id}/"; then
      return 0
    fi
    sleep 0.5
  done
  echo "The app's screens were still alive 10 s after a force-stop" >&2
  exit 1
}

for theme in light dark; do
  stop_app_and_settle
  if [ "$theme" = dark ]; then adb shell cmd uimode night yes; else adb shell cmd uimode night no; fi
  # The theme is set before any flow starts; a mismatch is a runner fault, not a flaky flow.
  want=$([ "$theme" = dark ] && echo yes || echo no)
  if ! adb shell cmd uimode night | grep -q "Night mode: ${want}"; then
    echo "Night mode did not switch to ${want}" >&2
    exit 1
  fi
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
