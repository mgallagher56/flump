import { expect, test } from "@playwright/test";
import { AUTH_STATE } from "../support/auth";
import { settle, syncBrowserClock } from "../support/page";
import { VISUAL_ROUTES } from "../visual/routes";
import { type CheckFindings, compareFindings } from "./baseline";
import { type CheckResult, runAxe, runFocusWalk, runLang, runReflow, runRender } from "./checks";
import { A11Y_PROJECTS, type A11yCheck } from "./projects";
import { readBaseline, recordOnly, UPDATE_HINT, writeFragment } from "./store";

const RUNNERS: Record<A11yCheck, (page: Parameters<typeof runAxe>[0]) => Promise<CheckResult>> = {
  // Order matters: the focus walk moves focus and scrolls, so it runs last.
  render: runRender,
  lang: runLang,
  axe: runAxe,
  reflow: runReflow,
  focus: runFocusWalk,
};
const ORDER: readonly A11yCheck[] = ["render", "lang", "axe", "reflow", "focus"];

for (const route of VISUAL_ROUTES) {
  test.describe(route.name, () => {
    if (route.signedIn) test.use({ storageState: AUTH_STATE });

    test(`${route.name} accessibility`, async ({ page }, testInfo) => {
      const project = testInfo.project.name;
      const checks = A11Y_PROJECTS.find((p) => p.name === project)?.checks ?? [];

      await syncBrowserClock(page);
      const response = await page.goto(route.url);
      expect(response?.status(), `${route.url} status`).toBeLessThan(400);
      if (route.signedIn) await expect(page).not.toHaveURL(/\/login|\/sandbox/);
      await settle(page);

      const findings: CheckFindings = {};
      const details: Record<string, string[]> = {};
      for (const check of ORDER) {
        if (!checks.includes(check)) continue;
        const result = await RUNNERS[check](page);
        findings[check] = result.counts;
        details[check] = result.details;
      }

      writeFragment(route.name, project, findings);
      const baseline = readBaseline();
      const label = `${route.name} [${project}]`;
      const { regressions, improvements } = compareFindings(
        label,
        findings,
        baseline.routes[route.name]?.[project],
      );
      for (const line of improvements) {
        testInfo.annotations.push({ type: "a11y-improved", description: line });
      }
      if (recordOnly(baseline)) {
        for (const line of regressions)
          testInfo.annotations.push({ type: "a11y-recorded", description: line });
        return;
      }

      const regressedChecks = new Set(
        regressions.map((line) => line.slice(label.length + 1).split(":")[0] ?? ""),
      );
      const detail = [...regressedChecks].flatMap((check) => details[check] ?? []);
      expect(
        regressions,
        [
          `New or worse accessibility failures on ${label}:`,
          ...regressions.map((line) => `  ${line}`),
          "Detail:",
          ...detail.map((line) => `  ${line}`),
          UPDATE_HINT,
        ].join("\n"),
      ).toEqual([]);
    });
  });
}
