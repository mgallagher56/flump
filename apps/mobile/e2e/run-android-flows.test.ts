/**
 * @jest-environment node
 */
/**
 * run-android-flows.sh with a fake adb and maestro on PATH (E12 S2a). Pins the fix for CI run
 * 45649031045: the app is stopped, and its screens gone, before each theme switch; a theme that
 * does not switch, or screens that will not go, fail the run instead of being retried.
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { isolatedPath } from "../../../scripts/lib/fake-bin";

const script = join(__dirname, "run-android-flows.sh");
const SHOTS = [
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
];

function run(opts: { screensStay?: boolean; nightStuck?: boolean; failFlow?: string } = {}) {
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
for s in ${SHOTS.join(" ")}; do touch "$s-$theme.png"; done
${opts.failFlow ? `[ "$flow" = "${opts.failFlow}" ] && exit 1` : ""}
exit 0
`;
  const bin = isolatedPath(dir, { fakes: { adb, maestro }, tools: ["find"] });
  const result = spawnSync(join(bin, "bash"), [script, join(dir, "app.apk"), join(dir, "out")], {
    encoding: "utf8",
    env: { ...process.env, PATH: bin, SETTLE_TRIES: "2" },
  });
  const calls = readFileSync(log, "utf8").trim().split("\n");
  return { result, calls };
}

describe("run-android-flows.sh", () => {
  it("stops the app and waits for its screens to go before each theme switch", () => {
    const { result, calls } = run();
    expect(result.status).toBe(0);
    for (const mode of ["no", "yes"]) {
      const switchAt = calls.indexOf(`shell cmd uimode night ${mode}`);
      const stopAt = calls.lastIndexOf("shell am force-stop app.flump.mobile", switchAt);
      expect(stopAt).toBeGreaterThan(-1);
      expect(calls.slice(stopAt, switchAt)).toContain("shell dumpsys activity activities");
    }
  });

  it("runs one flow at a time, each after a stop and settle, in both themes", () => {
    const { result, calls } = run();
    expect(result.status).toBe(0);
    const flows = calls.filter((c) => c.startsWith("maestro "));
    // Eleven flows in each theme (check-in-backend-down, check-in-walkthrough, engine-check,
    // not-invited, session-ended, sign-in, sign-in-after-sign-out, sign-in-denied, sign-out,
    // terms-required, update-required).
    expect(flows).toHaveLength(22);
    for (const flow of flows) {
      const at = calls.indexOf(flow);
      const before = calls.slice(0, at);
      const lastStop = before.lastIndexOf("shell am force-stop app.flump.mobile");
      const lastFlow = before.map((c) => c.startsWith("maestro ")).lastIndexOf(true);
      expect(lastStop).toBeGreaterThan(lastFlow);
      expect(calls.slice(lastStop, at)).toContain("shell dumpsys activity activities");
    }
  });

  it("a failed flow does not stop the others, and the run then fails", () => {
    const { result, calls } = run({ failFlow: "not-invited" });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Flow not-invited failed in light");
    expect(calls.filter((c) => c.startsWith("maestro "))).toHaveLength(22);
  });

  it("fails, without retrying, when the screens are still alive after the force-stop", () => {
    const { result, calls } = run({ screensStay: true });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("still alive");
    expect(calls).not.toContain("shell cmd uimode night no");
  });

  it("fails when night mode does not switch", () => {
    const { result } = run({ nightStuck: true });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Night mode did not switch to yes");
  });
});
