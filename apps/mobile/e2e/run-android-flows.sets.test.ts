/**
 * @jest-environment node
 */
/**
 * run-android-flows.sh themes and flow sets (owner, 26 November 2026): pull requests run light only
 * and shared-package pull requests the smoke set; the missing-screenshot check covers exactly the
 * flows and themes that ran.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { run, SHOTS } from "./run-android-flows.harness";

describe("run-android-flows.sh themes and flow sets", () => {
  it("with themes light, runs every flow once, in light only, and checks light screenshots", () => {
    const { result, calls } = run({ themes: "light" });
    expect(result.status).toBe(0);
    const flows = calls.filter((c) => c.startsWith("maestro "));
    expect(flows).toHaveLength(16);
    expect(flows.every((c) => c.endsWith(" light"))).toBe(true);
    expect(calls).toContain("shell cmd uimode night no");
    expect(calls).not.toContain("shell cmd uimode night yes");
  });

  it("the smoke set runs engine-check and sign-in only", () => {
    const { result, calls } = run({ themes: "light", flowSet: "smoke" });
    expect(result.status).toBe(0);
    expect(calls.filter((c) => c.startsWith("maestro "))).toEqual([
      "maestro engine-check light",
      "maestro sign-in light",
    ]);
  });

  it("fails on a missing screenshot from a flow that ran, in the theme that ran", () => {
    const light = run({ themes: "light", skipShot: "terms-required" });
    expect(light.result.status).toBe(1);
    expect(light.result.stderr).toContain("Missing screenshot terms-required-light.png");
    const both = run({ skipShot: "signed-in" });
    expect(both.result.stderr).toContain("Missing screenshot signed-in-light.png");
    expect(both.result.stderr).toContain("Missing screenshot signed-in-dark.png");
  });

  it("the smoke set requires its own flows' screenshots, not the others'", () => {
    // terms-required's flow did not run, so its screenshot is not required.
    expect(
      run({ themes: "light", flowSet: "smoke", skipShot: "terms-required" }).result.status,
    ).toBe(0);
    const missing = run({ themes: "light", flowSet: "smoke", skipShot: "signed-in" });
    expect(missing.result.status).toBe(1);
    expect(missing.result.stderr).toContain("Missing screenshot signed-in-light.png");
  });

  it("refuses an unknown theme, an empty theme list or an unknown flow set before installing", () => {
    for (const opts of [{ themes: "sepia" }, { themes: " " }, { flowSet: "some" }]) {
      const { result, calls } = run(opts);
      expect(result.status).toBe(2);
      expect(calls).toEqual([]);
    }
  });

  it("the full set's screenshots are the ones the flows take, each named per theme", () => {
    // The runner reads `- takeScreenshot: <name>-${THEME}` from each flow that ran; a screenshot
    // named any other way would never be checked.
    const flowsDir = join(__dirname, "flows");
    const text = readdirSync(flowsDir)
      .filter((f) => f.endsWith(".yaml"))
      .map((f) => readFileSync(join(flowsDir, f), "utf8"))
      .join("\n");
    // The runner reads top-level steps only, so an indented one (inside runFlow, when or repeat)
    // would never be checked: none is allowed.
    expect(text).not.toMatch(/^\s+- takeScreenshot:/m);
    const all = [...text.matchAll(/^- takeScreenshot: (.*)$/gm)].map((m) => m[1] ?? "");
    const perTheme = /^(.+)-\$\{THEME\}$/;
    expect(all.filter((name) => !perTheme.test(name))).toEqual([]);
    expect(all.map((name) => name.replace(perTheme, "$1")).sort()).toEqual([...SHOTS].sort());
  });
});
