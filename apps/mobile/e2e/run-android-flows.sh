#!/usr/bin/env bash
# Runs Maestro flows on the booted Android emulator, once per theme (E12 S2c).
# Called by CI's `🤖 Mobile e2e (Android)` job inside the emulator action.
#
#   bash apps/mobile/e2e/run-android-flows.sh <debug-apk> <output-dir> <themes> <flow-set>
#
# <themes> is "light", "dark" or "light dark"; <flow-set> is "full" (every flow) or "smoke"
# (engine-check and sign-in). scripts/mobile-e2e-scope.ts chooses both for each CI event.
#
# Flake policy: no retries. A failed flow fails the job; screenshots and Maestro's logs are in
# <output-dir> (uploaded as an artifact) to read why.
set -euo pipefail

usage="usage: run-android-flows.sh <debug-apk> <output-dir> <themes> <flow-set>"
apk="${1:?$usage}"
out="${2:?$usage}"
themes="${3:?$usage}"
flow_set="${4:?$usage}"
flows="$(cd "$(dirname "$0")" && pwd)/flows"

for theme in $themes; do
  case "$theme" in light | dark) ;; *) echo "Unknown theme ${theme}" >&2; exit 2 ;; esac
done
if [ -z "${themes// /}" ]; then echo "No theme given" >&2; exit 2; fi
case "$flow_set" in
  full) run_flows=("$flows"/*.yaml) ;;
  smoke) run_flows=("$flows/engine-check.yaml" "$flows/sign-in.yaml") ;;
  *) echo "Unknown flow set ${flow_set}" >&2; exit 2 ;;
esac

export MAESTRO_CLI_NO_ANALYTICS=1
export MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED=true

adb install -r "$apk"
# The debug build loads its JavaScript from Metro on the runner.
adb reverse tcp:8081 tcp:8081

mkdir -p "$out"
app_id=app.flump.mobile
failed=0

# Stops the app and waits until Android has destroyed its screens. Every flow starts with
# clearState (pm clear). On an app whose screen is still live, pm clear removes the task and waits
# for the screen to be destroyed; when that wait times out about a second later, Android kills the
# app's process again, which by then is the one the flow has just launched: a black screen for
# 3 minutes (CI runs 45649031045 and 45656969886, two different flows). With the app stopped and
# its screens gone first, there is nothing for that removal to wait on. So the runner calls this
# before every flow and every theme switch. Not a retry: if the screens are still there after 10 s,
# the run fails.
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

for theme in $themes; do
  stop_app_and_settle
  if [ "$theme" = dark ]; then adb shell cmd uimode night yes; else adb shell cmd uimode night no; fi
  # The theme is set before any flow starts; a mismatch is a runner fault, not a flaky flow.
  want=$([ "$theme" = dark ] && echo yes || echo no)
  if ! adb shell cmd uimode night | grep -q "Night mode: ${want}"; then
    echo "Night mode did not switch to ${want}" >&2
    exit 1
  fi
  mkdir -p "$out/$theme"
  # One flow at a time, so the app is stopped and settled before each flow's clearState. A failed
  # flow does not stop the others: the run still fails once they have all run.
  for flow in "${run_flows[@]}"; do
    name="$(basename "$flow" .yaml)"
    stop_app_and_settle
    # takeScreenshot writes to the working directory.
    if ! (cd "$out/$theme" && maestro test --format junit --output "$out/$theme/${name}.xml" \
      --test-output-dir "$out/$theme" -e THEME="$theme" "$flow"); then
      echo "Flow ${name} failed in ${theme}" >&2
      failed=1
    fi
  done
  # A screenshot that was not written is a failure, not a silent gap in the artifact: every
  # takeScreenshot in a flow that ran must have left its file.
  for shot in $(sed -n 's/^- takeScreenshot: \(.*\)-\${THEME}$/\1/p' "${run_flows[@]}"); do
    if [ -z "$(find "$out/$theme" -name "${shot}-${theme}.png" -print -quit)" ]; then
      echo "Missing screenshot ${shot}-${theme}.png" >&2
      failed=1
    fi
  done
done

exit "$failed"
