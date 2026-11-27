/**
 * Runs run-android-flows.sh with a fake adb and maestro on PATH, for run-android-flows.test.ts and
 * run-android-flows.sets.test.ts (two files so each stays under 5 seconds).
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { isolatedPath } from "../../../scripts/lib/fake-bin";

const script = join(__dirname, "run-android-flows.sh");
export const SHOTS = [
  "welcome",
  "engine-check",
  "sign-in",
  "signed-in",
  "sign-in-denied",
  "not-invited",
  "signed-out",
  "session-ended",
  "check-in-summary",
  "check-in-backend-down",
  "terms-required",
  "older-backend",
  "signed-in-again",
  "sign-out-confirm",
  "update-required",
  "tab-home",
  "tab-accounts",
  "tab-budget",
  "tab-pay",
  "tab-more",
  "more-page",
  "link-not-found",
  "not-set-up",
  "home-owner",
  "home-renter",
  "home-out-of-step",
  "home-empty",
  "home-strip-renter",
  "home-strip-pension",
  "home-strip-prompt",
];

export function run(
  opts: {
    screensStay?: boolean;
    nightStuck?: boolean;
    failFlow?: string;
    /** A screenshot the fake maestro leaves out. */
    skipShot?: string;
    themes?: string;
    flowSet?: string;
  } = {},
) {
  const dir = mkdtempSync(join(tmpdir(), "flows-"));
  const log = join(dir, "adb.log");
  const night = join(dir, "night");
  writeFileSync(night, "no");
  // The PATH holds the fakes and links to the named real tools only (isolatedPath), so a real adb
  // or maestro on the machine can never answer in place of a fake.
  const adb = `#!/usr/bin/env bash
echo "$*" >> "${log}"
case "$*" in
  "shell dumpsys activity activities")
    ${opts.screensStay ? 'echo "  * ActivityRecord{abc u0 app.flump.mobile/.MainActivity t9}"' : 'echo "  (nothing)"'} ;;
  "shell cmd uimode night yes") ${opts.nightStuck ? "" : `echo yes > "${night}"`} ;;
  "shell cmd uimode night no") echo no > "${night}" ;;
  "shell cmd uimode night") echo "Night mode: $(cat "${night}")" ;;
esac
`;
  // The fake maestro writes every screenshot the runner requires for the theme it is given.
  const maestro = `#!/usr/bin/env bash
theme=$(printf '%s\\n' "$@" | sed -n 's/^THEME=//p')
flow=$(basename "\${@: -1}" .yaml)
echo "maestro $flow $theme" >> "${log}"
for s in ${SHOTS.filter((s) => s !== opts.skipShot).join(" ")}; do touch "$s-$theme.png"; done
${opts.failFlow ? `[ "$flow" = "${opts.failFlow}" ] && exit 1` : ""}
exit 0
`;
  const bin = isolatedPath(dir, { fakes: { adb, maestro }, tools: ["find", "sed"] });
  const args = [join(dir, "app.apk"), join(dir, "out"), opts.themes ?? "light dark"];
  const result = spawnSync(join(bin, "bash"), [script, ...args, opts.flowSet ?? "full"], {
    encoding: "utf8",
    env: { ...process.env, PATH: bin, SETTLE_TRIES: "2" },
  });
  const calls = existsSync(log) ? readFileSync(log, "utf8").trim().split("\n") : [];
  return { result, calls };
}
