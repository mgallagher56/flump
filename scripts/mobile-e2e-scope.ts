/**
 * What the CI job `🤖 Mobile e2e (Android)` runs for this event (owner, 26 November 2026):
 *
 *   bun scripts/mobile-e2e-scope.ts
 *
 * - Push to main and the nightly schedule: every flow, in light and dark.
 * - A pull request that changes the app, the e2e files, this job's own steps or scripts, or what
 *   installs the app's dependencies: every flow, in light.
 * - A pull request that changes only shared packages the app uses: the smoke set
 *   (`engine-check`, `sign-in`), in light.
 * - Any other pull request: nothing; the job still reports a pass in seconds, so the required
 *   check is never left pending.
 *
 * Writes `run`, `flows` (full, smoke or none), `themes` and `reason` to $GITHUB_OUTPUT.
 */
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { appendFileSync } from "node:fs";
import { type BunLock, lockClosure } from "./android-apk-cache-key";

export interface Scope {
  readonly run: boolean;
  readonly flows: "full" | "smoke" | "none";
  readonly themes: "light" | "light dark";
  readonly reason: string;
}

export interface ScopeInput {
  readonly event: string;
  readonly changed: readonly string[];
  /** The workflow's header (triggers, env, concurrency) or this job's block differs from base. */
  readonly jobChanged: boolean;
  /** The app's transitive lockfile set (scripts/android-apk-cache-key.ts) differs from base. */
  readonly appLockChanged: boolean;
}

/** Changes that run every flow: the app, its e2e files, and this job's own steps and scripts. */
const FULL = [
  /^apps\/mobile\//,
  /^scripts\/(check-android-backup|android-apk-cache-key|mobile-e2e-scope)\.ts$/,
  /^\.github\/actions\//,
  /^package\.json$/,
  /^bunfig\.toml$/,
  /^\.node-version$/,
];
/** Workspace packages the app uses (its `@flump/*` dependencies), and their shared tsconfig. */
export const SHARED_PACKAGES = [
  "api-client",
  "api-contract",
  "business-details",
  "finance-engine",
  "format",
  "tokens",
  "typescript-config",
];
/** Changes to those packages, or to how they are built, run the smoke set. */
const SHARED = [new RegExp(`^packages/(${SHARED_PACKAGES.join("|")})/`), /^turbo\.json$/];

export function decideScope(input: ScopeInput): Scope {
  if (input.event !== "pull_request") {
    return { run: true, flows: "full", themes: "light dark", reason: `${input.event} event` };
  }
  const full = input.changed.find((f) => FULL.some((re) => re.test(f)));
  if (full) return { run: true, flows: "full", themes: "light", reason: `${full} changed` };
  if (input.jobChanged) {
    return { run: true, flows: "full", themes: "light", reason: "this job's workflow changed" };
  }
  if (input.appLockChanged) {
    return { run: true, flows: "full", themes: "light", reason: "the app's dependencies changed" };
  }
  const shared = input.changed.find((f) => SHARED.some((re) => re.test(f)));
  if (shared) return { run: true, flows: "smoke", themes: "light", reason: `${shared} changed` };
  return { run: false, flows: "none", themes: "light", reason: "nothing the app uses changed" };
}

/** The workflow's header (everything before `jobs:`) and the mobile-e2e-android job's block. */
export function jobText(workflow: string): string {
  const lines = workflow.split("\n");
  const jobs = lines.indexOf("jobs:");
  const start = lines.indexOf("  mobile-e2e-android:");
  if (jobs === -1 || start === -1) return workflow;
  let end = start + 1;
  while (end < lines.length && !/^ {2}[\w-]+:\s*$/.test(lines[end])) end++;
  return [...lines.slice(0, jobs), ...lines.slice(start, end)].join("\n");
}

const git = (args: string[]): string => {
  const out = spawnSync("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (out.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${out.stderr.trim()}`);
  return out.stdout;
};

if (import.meta.main) {
  const event = process.env.GITHUB_EVENT_NAME ?? "";
  const base = process.env.BASE_REF ?? "";
  let input: ScopeInput = { event, changed: [], jobChanged: false, appLockChanged: false };
  if (event === "pull_request") {
    if (!base) throw new Error("BASE_REF is not set on a pull_request event");
    const mergeBase = git(["merge-base", `origin/${base}`, "HEAD"]).trim();
    const changed = git(["diff", "--name-only", `${mergeBase}...HEAD`])
      .split("\n")
      .filter(Boolean);
    const at = (ref: string, path: string) => git(["show", `${ref}:${path}`]);
    const workflow = ".github/workflows/ci-pipeline.yml";
    // A lockfile this cannot read counts as changed: the full set runs.
    const closure = (text: string) => {
      try {
        return lockClosure(Bun.JSONC.parse(text) as BunLock, "apps/mobile").join("\n");
      } catch {
        return randomUUID();
      }
    };
    input = {
      event,
      changed,
      jobChanged:
        changed.includes(workflow) &&
        jobText(at(mergeBase, workflow)) !== jobText(at("HEAD", workflow)),
      appLockChanged:
        changed.includes("bun.lock") &&
        closure(at(mergeBase, "bun.lock")) !== closure(at("HEAD", "bun.lock")),
    };
  }
  const scope = decideScope(input);
  const lines = [
    `run=${scope.run}`,
    `flows=${scope.flows}`,
    `themes=${scope.themes}`,
    `reason=${scope.reason}`,
  ];
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${lines.join("\n")}\n`);
  const what = scope.run ? `${scope.flows} flow set in ${scope.themes}` : "nothing to run";
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      `### 🤖 Mobile e2e: ${what}\n\n${scope.reason}.\n\n`,
    );
  }
  console.log(`${what}: ${scope.reason}`);
}
