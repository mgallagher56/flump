/**
 * @jest-environment node
 */
/**
 * run-android-flows.sh with a fake adb and maestro on PATH (E12 S2a). Pins the fix for CI run
 * 45649031045: the app is stopped, and its screens gone, before each theme switch; a theme that
 * does not switch, or screens that will not go, fail the run instead of being retried.
 */
import { run } from "./run-android-flows.harness";

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
    // Fourteen flows in each theme (check-in-backend-down, check-in-walkthrough, engine-check,
    // not-invited, not-set-up, older-backend, session-ended, sign-in, sign-in-after-sign-out, sign-in-denied, sign-out,
    // tabs, terms-required, update-required).
    expect(flows).toHaveLength(28);
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
    expect(calls.filter((c) => c.startsWith("maestro "))).toHaveLength(28);
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
