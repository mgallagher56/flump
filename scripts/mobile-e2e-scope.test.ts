import { describe, expect, test } from "bun:test";
import { decideScope, jobText, type ScopeInput } from "./mobile-e2e-scope";

const pr = (changed: string[], extra: Partial<ScopeInput> = {}): ScopeInput => ({
  event: "pull_request",
  changed,
  jobChanged: false,
  appLockChanged: false,
  ...extra,
});

describe("decideScope: which flows and themes the mobile e2e job runs", () => {
  test("push to main and the nightly schedule run every flow in light and dark", () => {
    for (const event of ["push", "schedule"]) {
      const scope = decideScope({ event, changed: [], jobChanged: false, appLockChanged: false });
      expect(scope).toMatchObject({ run: true, flows: "full", themes: "light dark" });
    }
  });

  test("a pull request that changes the app, its e2e files or the job's scripts runs every flow in light", () => {
    for (const file of [
      "apps/mobile/src/theme/index.ts",
      "apps/mobile/e2e/flows/sign-in.yaml",
      "apps/mobile/package.json",
      "scripts/android-apk-cache-key.ts",
      "scripts/mobile-e2e-scope.ts",
      "scripts/check-android-backup.ts",
      ".github/actions/bun-setup/action.yml",
      "package.json",
      "bunfig.toml",
      ".node-version",
    ]) {
      expect(decideScope(pr(["docs/x.md", file]))).toEqual({
        run: true,
        flows: "full",
        themes: "light",
        reason: `${file} changed`,
      });
    }
  });

  test("a pull request that changes only shared packages runs the smoke set in light", () => {
    for (const file of [
      "packages/finance-engine/src/tax/income-tax.ts",
      "packages/api-contract/src/index.ts",
      "packages/api-client/src/index.ts",
      "packages/tokens/src/index.ts",
      "packages/format/src/index.ts",
      "packages/business-details/src/index.ts",
      "packages/typescript-config/base.json",
      "turbo.json",
    ]) {
      expect(decideScope(pr([file, "apps/web/app/root.tsx"]))).toMatchObject({
        run: true,
        flows: "smoke",
        themes: "light",
      });
    }
  });

  test("an app change wins over a shared-package change", () => {
    const scope = decideScope(pr(["packages/format/src/index.ts", "apps/mobile/app/index.tsx"]));
    expect(scope.flows).toBe("full");
  });

  test("this job's workflow or the app's lockfile set changing runs every flow in light", () => {
    const workflow = [".github/workflows/ci-pipeline.yml"];
    expect(decideScope(pr(workflow, { jobChanged: true }))).toMatchObject({ flows: "full" });
    expect(decideScope(pr(["bun.lock"], { appLockChanged: true }))).toMatchObject({
      flows: "full",
      themes: "light",
    });
  });

  test("other jobs' workflow edits, other lockfile changes and other packages run nothing", () => {
    for (const changed of [
      [".github/workflows/ci-pipeline.yml"],
      ["bun.lock"],
      ["packages/ui/src/Button/Button.tsx"],
      ["apps/web/app/root.tsx", "docs/audit/EPICS.md"],
      ["apps/mobile-old.md"],
      [],
    ]) {
      expect(decideScope(pr(changed))).toEqual({
        run: false,
        flows: "none",
        themes: "light",
        reason: "nothing the app uses changed",
      });
    }
  });
});

describe("jobText: the part of the workflow this job depends on", () => {
  const workflow = (header: string, mine: string, other: string) =>
    `name: CI\non:\n  ${header}\njobs:\n  lint:\n    runs-on: ${other}\n  mobile-e2e-android:\n    runs-on: ${mine}\n  docker-build:\n    runs-on: ${other}\n`;

  test("changes with this job's block or the workflow header", () => {
    const base = jobText(workflow("push", "a", "a"));
    expect(jobText(workflow("push", "b", "a"))).not.toBe(base);
    expect(jobText(workflow("pull_request", "a", "a"))).not.toBe(base);
  });

  test("ignores other jobs", () => {
    expect(jobText(workflow("push", "a", "b"))).toBe(jobText(workflow("push", "a", "a")));
  });

  test("a workflow without the job is compared whole", () => {
    expect(jobText("name: CI\njobs:\n  lint:\n")).toBe("name: CI\njobs:\n  lint:\n");
  });
});
