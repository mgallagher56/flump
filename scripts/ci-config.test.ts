import { describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  MAX_QUARANTINED,
  QUARANTINE,
  quarantinePattern,
  quarantineProblems,
  quarantineSummary,
} from "../apps/e2e/quarantine";

const repoRoot = resolve(import.meta.dir, "..");

function readJson(file: string) {
  return JSON.parse(readFileSync(resolve(repoRoot, file), "utf8"));
}

describe("lint configuration", () => {
  test("root lint script never writes", () => {
    const { scripts } = readJson("package.json");
    expect(scripts.lint).not.toMatch(/--write|--apply/);
    expect(scripts.lint).toBe("biome ci .");
  });

  test("a local fixing script is available", () => {
    const { scripts } = readJson("package.json");
    expect(scripts["lint:fix"]).toBe("biome check --write .");
  });

  test("biome excludes release-please changelogs", () => {
    const biome = readJson("biome.json");
    expect(biome.files.includes).toContain("!**/CHANGELOG.md");
  });
});

describe("coverage configuration", () => {
  const workspaces = [
    "apps/backend",
    "apps/marketing",
    "packages/banking",
    "packages/finance-engine",
    "packages/mcp",
    "packages/tokens",
    "packages/ui",
  ];

  for (const ws of workspaces) {
    test(`${ws} declares an explicit v8 coverage include list`, () => {
      const file = ["vitest.config.ts", "vitest.config.mts"]
        .map((name) => resolve(repoRoot, ws, name))
        .find((path) => existsSync(path));
      expect(file).toBeDefined();
      const source = readFileSync(file as string, "utf8");
      expect(source).toMatch(/provider:\s*"v8"/);
      expect(source).toMatch(/coverage:\s*\{[\s\S]*include:/);
      expect(source).toMatch(/json-summary/);
    });
  }

  test("coverage output is gitignored", () => {
    const ignore = readFileSync(resolve(repoRoot, ".gitignore"), "utf8");
    expect(ignore.split("\n")).toContain("coverage/");
  });

  test("no coverage output is tracked by git", () => {
    const tracked = execFileSync("git", ["ls-files"], {
      cwd: repoRoot,
      encoding: "utf8",
    })
      .split("\n")
      .filter((path) => /(^|\/)coverage\//.test(path));
    expect(tracked).toEqual([]);
  });
});

describe("launch-readiness checklist (E24-T10)", () => {
  test("CI runs the advisory report and the root script exists", () => {
    const { scripts } = readJson("package.json");
    expect(scripts["check:launch"]).toBe("bun scripts/check-launch-readiness.ts");
    const ci = readFileSync(resolve(repoRoot, ".github/workflows/ci-pipeline.yml"), "utf8");
    expect(ci).toContain("bun run check:launch");
    expect(ci).toContain("--markdown");
    const step = ci.slice(ci.indexOf("Launch-readiness report"));
    expect(step.slice(0, step.indexOf("Test repo scripts"))).toContain("continue-on-error: true");
  });
});

describe("retention command smoke (BE-15, N8)", () => {
  test("the Docker job runs the retention cron's own command inside the built backend image", () => {
    const ci = readFileSync(resolve(repoRoot, ".github/workflows/ci-pipeline.yml"), "utf8");
    const job = ci.slice(ci.indexOf("  docker-build:"));
    const step = job.slice(job.indexOf("Backend retention command smoke"));
    const body = step.slice(0, step.indexOf("- name:", 1));
    const { deploy } = readJson("apps/backend/retention.railway.json");
    expect(deploy.startCommand).toBe("bun dist/jobs/retention-purge.js");
    expect(body).toContain(`flump-backend-ci ${deploy.startCommand}`);
    // It needs the boot smoke's migrated database, so it comes after it in the same job.
    expect(job.indexOf("Backend container boot smoke")).toBeLessThan(
      job.indexOf("Backend retention command smoke"),
    );
    expect(body).not.toContain("RETENTION_HEARTBEAT_URL");
  });
});

describe("tax-year calendar guard (E22)", () => {
  test("CI runs the guard and the root script exists", () => {
    const { scripts } = readJson("package.json");
    expect(scripts["check:tax-calendar"]).toBe("bun scripts/check-tax-year-calendar.ts");
    const ci = readFileSync(resolve(repoRoot, ".github/workflows/ci-pipeline.yml"), "utf8");
    expect(ci).toContain("bun run check:tax-calendar");
  });
});

// BE-01 (H11, L8, L10): the merge gate. GitHub matches required checks by the job's rendered
// name, so the list in .github/required-checks.json must match the workflows exactly.
type Job = {
  name?: string;
  if?: string;
  "continue-on-error"?: unknown;
  strategy?: { matrix?: { include?: Record<string, unknown>[] } };
};
type Workflow = { on: Record<string, unknown>; jobs: Record<string, Job> };

function readWorkflow(file: string): Workflow {
  return Bun.YAML.parse(
    readFileSync(resolve(repoRoot, ".github/workflows", file), "utf8"),
  ) as Workflow;
}

/** Rendered check names for a job: one per matrix include entry, else the plain name. */
function renderedNames(id: string, job: Job): string[] {
  const name = job.name ?? id;
  const include = job.strategy?.matrix?.include;
  if (!include || !name.includes("${{")) return [name];
  return include.map((entry) =>
    name.replace(/\$\{\{\s*matrix\.(\w+)\s*\}\}/g, (_, key: string) => String(entry[key])),
  );
}

/** Evaluates a job `if:` for a pull_request event. Only the shapes these workflows use. */
function runsOnPullRequest(condition: string | undefined): boolean {
  if (!condition) return true;
  const js = condition
    .replace(/\$\{\{|\}\}/g, "")
    .replace(/always\(\)/g, "true")
    .replace(/!cancelled\(\)/g, "true")
    .replace(/github\.event_name/g, "'pull_request'");
  if (!/^[\s'a-z_!=|&()]+$/.test(js)) throw new Error(`unsupported if: ${condition}`);
  return Boolean(new Function(`return (${js});`)());
}

describe("merge gate (BE-01)", () => {
  const required = readJson(".github/required-checks.json") as {
    strict: boolean;
    enforceAdmins: boolean;
    checks: { name: string; workflow: string; job: string }[];
  };

  test("branch protection settings are strict and enforced for admins", () => {
    expect(required.strict).toBe(true);
    expect(required.enforceAdmins).toBe(true);
  });

  test("every required check is a real job name that runs on pull requests and can fail", () => {
    for (const check of required.checks) {
      const wf = readWorkflow(check.workflow);
      expect(Object.keys(wf.on)).toContain("pull_request");
      const job = wf.jobs[check.job];
      expect(job).toBeDefined();
      expect(renderedNames(check.job, job)).toContain(check.name);
      expect(runsOnPullRequest(job.if)).toBe(true);
      expect(job["continue-on-error"]).toBeUndefined();
    }
  });

  test("the list covers the gates the audit named", () => {
    const names = required.checks.map((c) => c.name);
    for (const gate of [
      "🎭 E2E smoke",
      "🐳 Docker images",
      "🛡️ Dependency audit",
      "🔑 Secret scan (gitleaks)",
      "🧰 Ops script tests",
      "♿ Storybook a11y (light)",
      "♿ Storybook a11y (dark)",
      "🔎 SAST (Semgrep CE)",
    ])
      expect(names).toContain(gate);
    expect(new Set(names).size).toBe(names.length);
  });

  test("no two jobs across workflows render the same check name", () => {
    const seen = new Map<string, string>();
    for (const file of [
      "ci-pipeline.yml",
      "security-scan.yml",
      "visual-regression.yml",
      "backup.yml",
      "load-smoke.yml",
    ]) {
      for (const [id, job] of Object.entries(readWorkflow(file).jobs))
        for (const name of renderedNames(id, job)) {
          expect(seen.get(name)).toBeUndefined();
          seen.set(name, `${file}#${id}`);
        }
    }
  });

  test("Semgrep fails a pull request on new findings only (diff-aware baseline)", () => {
    const wf = readFileSync(resolve(repoRoot, ".github/workflows/security-scan.yml"), "utf8");
    expect(wf).toContain("--baseline-commit=");
    expect(wf).toContain("--error");
  });

  test("the Docker job builds on any backend, web, marketing, package or lockfile change", () => {
    const wf = readFileSync(resolve(repoRoot, ".github/workflows/ci-pipeline.yml"), "utf8");
    const filter = wf.slice(wf.indexOf("Did anything that goes into an image change?"));
    for (const fragment of ["apps/(backend|web|marketing)/", "^packages/", "bun\\.lock"])
      expect(filter.slice(0, 1200)).toContain(fragment);
    expect(wf).toContain("/health/ready");
  });
});

const workflowFiles = readdirSync(resolve(repoRoot, ".github/workflows")).filter((f) =>
  /\.ya?ml$/.test(f),
);

const actionFiles = readdirSync(resolve(repoRoot, ".github/actions"))
  .map((dir) => `.github/actions/${dir}/action.yml`)
  .filter((rel) => existsSync(resolve(repoRoot, rel)));

/**
 * E36 2(a): allowlist for `trustedDependencies` across all workspace package.json files.
 * Every entry requires a non-empty documented reason. Empty by default: lifecycle scripts stay off.
 */
const TRUSTED_DEPENDENCIES_ALLOWLIST: Record<string, string> = {};

describe("supply chain (BE-01 L8, M17, E36 2(a))", () => {
  const files = [...workflowFiles.map((f) => `.github/workflows/${f}`), ...actionFiles];

  test("every third-party action across all workflows and composite actions is pinned to a full 40-char commit SHA", () => {
    expect(workflowFiles.length).toBeGreaterThanOrEqual(7);
    const unpinned = files.flatMap((file) =>
      readFileSync(resolve(repoRoot, file), "utf8")
        .split("\n")
        .filter((line) => /^\s*-?\s*uses:\s/.test(line))
        .filter((line) => !/uses:\s*\.\//.test(line) && !/@[0-9a-f]{40}(\s|$)/.test(line))
        .map((line) => `${file}: ${line.trim()}`),
    );
    expect(unpinned).toEqual([]);
  });

  test("bunfig.toml enforces a 7-day (604800s) minimumReleaseAge gate (E36 2(a))", () => {
    const bunfigPath = resolve(repoRoot, "bunfig.toml");
    expect(existsSync(bunfigPath)).toBe(true);
    const bunfig = Bun.TOML.parse(readFileSync(bunfigPath, "utf8")) as {
      install?: {
        minimumReleaseAge?: number;
        minimumReleaseAgeExcludes?: string[];
      };
    };
    expect(bunfig.install?.minimumReleaseAge).toBe(604800);
    expect(bunfig.install?.minimumReleaseAgeExcludes ?? []).toEqual([]);
  });

  test("renovate.json enforces a 7-day minimumReleaseAge for npm packages with no shorter 3-day override (E36 2(a))", () => {
    const renovateRaw = readFileSync(resolve(repoRoot, "renovate.json"), "utf8");
    const renovate = JSON.parse(renovateRaw) as {
      minimumReleaseAge?: string;
      packageRules?: {
        matchDatasources?: string[];
        matchPackageNames?: string[];
        minimumReleaseAge?: string;
      }[];
    };
    expect(renovate.minimumReleaseAge).toBe("7 days");
    const rulesWithAge = (renovate.packageRules ?? []).filter(
      (r) => r.minimumReleaseAge !== undefined,
    );
    expect(rulesWithAge.length).toBeGreaterThanOrEqual(2);
    for (const rule of rulesWithAge) {
      expect(rule.minimumReleaseAge).toBe("7 days");
    }
    expect(renovateRaw).not.toContain('"3 days"');
  });

  test("no workspace package.json defines unapproved trustedDependencies (E36 2(a))", () => {
    const manifestPaths = [
      "package.json",
      ...["apps", "packages"].flatMap((group) =>
        readdirSync(resolve(repoRoot, group))
          .map((dir) => `${group}/${dir}/package.json`)
          .filter((rel) => existsSync(resolve(repoRoot, rel))),
      ),
    ];
    expect(manifestPaths.length).toBeGreaterThanOrEqual(8);

    const violations: string[] = [];
    for (const rel of manifestPaths) {
      const pkg = readJson(rel) as { trustedDependencies?: unknown };
      if (pkg.trustedDependencies === undefined) continue;
      if (!Array.isArray(pkg.trustedDependencies)) {
        violations.push(`${rel}: trustedDependencies is not an array`);
        continue;
      }
      for (const dep of pkg.trustedDependencies) {
        const reason = TRUSTED_DEPENDENCIES_ALLOWLIST[String(dep)];
        if (!reason || reason.trim() === "") {
          violations.push(`${rel}: unapproved trustedDependency "${String(dep)}"`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  test("SECURITY.md and RFC 9116 .well-known/security.txt are published without placeholders (E36 H2)", () => {
    const securityMdPath = resolve(repoRoot, "SECURITY.md");
    expect(existsSync(securityMdPath)).toBe(true);
    const securityMd = readFileSync(securityMdPath, "utf8");
    expect(securityMd).toContain("https://github.com/mgallagher56/flump/security/advisories/new");
    expect(securityMd).not.toMatch(/example\.invalid|PLACEHOLDER|flump\.(app|co\.uk)/);

    for (const rel of [
      "apps/web/public/.well-known/security.txt",
      "apps/marketing/public/.well-known/security.txt",
    ]) {
      const full = resolve(repoRoot, rel);
      expect(existsSync(full), rel).toBe(true);
      const txt = readFileSync(full, "utf8");
      expect(txt, rel).toMatch(/^Contact: https:\/\//m);
      expect(txt, rel).toMatch(/^Expires: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/m);
      expect(txt, rel).toMatch(/^Preferred-Languages: en$/m);
      expect(txt, rel).toMatch(/^Policy: https:\/\//m);
      expect(txt, rel).not.toMatch(/example\.invalid|PLACEHOLDER|flump\.(app|co\.uk)/);
    }
  });

  test("CI and every image install with lifecycle scripts off", () => {
    const action = readFileSync(resolve(repoRoot, ".github/actions/bun-setup/action.yml"), "utf8");
    expect(action).toContain("bun install --frozen-lockfile --ignore-scripts");
    // First-party workspace codegen still runs, explicitly, after the scriptless install.
    expect(action).toContain("bun run --filter './apps/*' --filter './packages/*' prepare");
    for (const app of ["backend", "web", "marketing"]) {
      const dockerfile = readFileSync(resolve(repoRoot, `apps/${app}/Dockerfile`), "utf8");
      for (const line of dockerfile.split("\n").filter((l) => l.includes("bun install")))
        expect(line).toContain("--ignore-scripts");
    }
  });

  test("Docker base images are pinned by digest", () => {
    for (const file of [
      "apps/backend/Dockerfile",
      "apps/web/Dockerfile",
      "apps/marketing/Dockerfile",
      "scripts/ops/backup.Dockerfile",
    ]) {
      const dockerfile = readFileSync(resolve(repoRoot, file), "utf8");
      for (const line of dockerfile.split("\n").filter((l) => /^FROM\s+[^\s]+:/.test(l)))
        expect(line).toMatch(/@sha256:[0-9a-f]{64}/);
    }
  });

  test("backend and web runtime images carry production dependencies only", () => {
    for (const app of ["backend", "web"]) {
      const dockerfile = readFileSync(resolve(repoRoot, `apps/${app}/Dockerfile`), "utf8");
      expect(dockerfile).toContain("--production");
    }
    const backend = readFileSync(resolve(repoRoot, "apps/backend/Dockerfile"), "utf8");
    expect(backend).not.toContain(
      "COPY --from=build --chown=bun:bun /app/apps/backend ./apps/backend\n",
    );
  });
});

describe("backend type safety (BE-01 M21)", () => {
  test("backend is strict, and check:laws runs the backend laws", () => {
    const tsconfig = Bun.JSONC.parse(
      readFileSync(resolve(repoRoot, "apps/backend/tsconfig.json"), "utf8"),
    ) as { compilerOptions: Record<string, unknown> };
    expect(tsconfig.compilerOptions.strict).toBe(true);
    const { scripts } = readJson("package.json");
    expect(scripts["check:laws"]).toContain("bun scripts/check-backend-laws.ts");
  });
});

// SEC-E (S7, S8, S9) and BE-17 (M17, L10). Every workflow file is read from disk, so a new
// workflow is covered without being added to a list.
type Step = { uses?: string; with?: Record<string, unknown> };
type HardenedJob = {
  container?: string | { image?: string };
  services?: Record<string, { image?: string }>;
  steps?: Step[];
};
type HardenedWorkflow = {
  on: Record<string, unknown>;
  permissions?: Record<string, string> | string;
  jobs: Record<string, HardenedJob>;
};

const hardened = workflowFiles.map((file) => ({
  file,
  source: readFileSync(resolve(repoRoot, ".github/workflows", file), "utf8"),
  workflow: Bun.YAML.parse(
    readFileSync(resolve(repoRoot, ".github/workflows", file), "utf8"),
  ) as HardenedWorkflow,
}));

describe("CI hardening (SEC-E)", () => {
  test("the workflow list is the one this file knows", () => {
    expect(workflowFiles.sort()).toEqual([
      "a11y-gate.yml",
      "backup.yml",
      "ci-pipeline.yml",
      "load-smoke.yml",
      "release-please.yml",
      "security-scan.yml",
      "visual-regression.yml",
    ]);
  });

  test("every checkout drops its credentials (S8)", () => {
    const persisted: string[] = [];
    let checkouts = 0;
    for (const { file, workflow } of hardened)
      for (const [id, job] of Object.entries(workflow.jobs))
        for (const step of job.steps ?? []) {
          if (!step.uses?.startsWith("actions/checkout@")) continue;
          checkouts++;
          if (step.with?.["persist-credentials"] !== false) persisted.push(`${file}#${id}`);
        }
    expect(checkouts).toBeGreaterThan(10);
    expect(persisted).toEqual([]);
  });

  test("no job pushes with git, so no checkout needs its credentials", () => {
    for (const { file, source } of hardened)
      expect(source, file).not.toMatch(/git\s+(push|commit)\b/);
  });

  test("every service and container image is pinned by digest (S7)", () => {
    const tagPinned: string[] = [];
    let images = 0;
    for (const { file, workflow } of hardened)
      for (const [id, job] of Object.entries(workflow.jobs)) {
        const container = typeof job.container === "string" ? job.container : job.container?.image;
        const all = [container, ...Object.values(job.services ?? {}).map((s) => s.image)];
        for (const image of all) {
          if (image === undefined) continue;
          images++;
          if (!/@sha256:[0-9a-f]{64}$/.test(image)) tagPinned.push(`${file}#${id}: ${image}`);
        }
      }
    expect(images).toBeGreaterThan(8);
    expect(tagPinned).toEqual([]);
  });

  test("images named in workflow scripts are pinned by digest too", () => {
    for (const { file, source } of hardened)
      for (const line of source.split("\n").filter((l) => /^\s*[A-Z_]+_IMAGE:\s/.test(l)))
        expect(line, file).toMatch(/@sha256:[0-9a-f]{64}\s*$/);
  });

  test("no workflow runs with a privileged trigger or broad default permissions", () => {
    for (const { file, source, workflow } of hardened) {
      expect(Object.keys(workflow.on), file).not.toContain("pull_request_target");
      expect(Object.keys(workflow.on), file).not.toContain("workflow_run");
      // Attacker-controlled text must never be interpolated into a script.
      expect(source, file).not.toMatch(
        /\$\{\{\s*github\.(head_ref|event\.(pull_request\.(title|body|head\.ref)|head_commit\.message|issue\.title|comment\.body))/,
      );
      // release-please opens the release PR, so it alone holds write permissions at the top.
      if (file === "release-please.yml") continue;
      expect(workflow.permissions, file).toEqual({ contents: "read" });
    }
  });
});

describe("image ownership and contents (SEC-E S9, BE-17 M17)", () => {
  const runnerStage = (app: string) => {
    const dockerfile = readFileSync(resolve(repoRoot, `apps/${app}/Dockerfile`), "utf8");
    const at = dockerfile.indexOf("FROM base AS runner");
    expect(at).toBeGreaterThan(0);
    return { build: dockerfile.slice(0, at), runner: dockerfile.slice(at) };
  };

  test("app files are copied as root and the server runs as bun", () => {
    for (const app of ["backend", "web", "marketing"]) {
      const { runner } = runnerStage(app);
      const copies = runner.split("\n").filter((l) => l.startsWith("COPY "));
      expect(copies.length).toBeGreaterThan(2);
      for (const line of copies) expect(line, app).not.toContain("--chown");
      const instructions = runner.split("\n").filter((l) => !l.startsWith("#"));
      expect(instructions.join("\n"), app).not.toMatch(/\bchown\b|\bchmod\b/);
      expect(runner, app).toMatch(/^USER bun$/m);
      // USER comes after the last COPY, so nothing is written as the runtime user.
      expect(runner.lastIndexOf("\nCOPY ")).toBeLessThan(runner.indexOf("\nUSER bun"));
    }
  });

  test("CI checks ownership inside the built images", () => {
    const ci = readFileSync(resolve(repoRoot, ".github/workflows/ci-pipeline.yml"), "utf8");
    const step = ci.slice(ci.indexOf("Image hardening (non-root"));
    const body = step.slice(0, step.indexOf("- name:", 1));
    expect(body).toContain("for app in backend web marketing");
    expect(body).toContain('find /app -user "$(id -u)"');
    expect(body).toContain("find /app -writable");
  });

  test("the web runtime image copies the runtime file set, not the app source", () => {
    const { runner } = runnerStage("web");
    expect(runner).not.toMatch(/COPY --from=build\s+\/app\/apps\/web\s/);
    expect(runner).toContain("COPY --from=build /runtime/web ./apps/web");
    const ci = readFileSync(resolve(repoRoot, ".github/workflows/ci-pipeline.yml"), "utf8");
    expect(ci).toContain("Web image holds built output only");
  });

  test("the Sentry build token stays in the web build stage and is never a secret mount", () => {
    const { build, runner } = runnerStage("web");
    // Railway's builder rejects secret mounts, so the token is a build-stage ARG.
    expect(build).toContain("ARG SENTRY_AUTH_TOKEN");
    expect(build + runner).not.toMatch(/^RUN .*--mount=type=secret/m);
    expect(runner).not.toMatch(/SENTRY_AUTH_TOKEN/);
    expect(runner).not.toMatch(/^(ARG|ENV)\s+SENTRY/m);
    expect(build).not.toMatch(/^ENV\s+SENTRY_AUTH_TOKEN/m);
    // The runner starts again from the base image: nothing of the build stage is inherited.
    expect(runner.startsWith("FROM base AS runner")).toBe(true);
    const ci = readFileSync(resolve(repoRoot, ".github/workflows/ci-pipeline.yml"), "utf8");
    expect(ci).toContain('--build-arg "SENTRY_AUTH_TOKEN=$TOKEN_CANARY"');
    expect(ci).toContain("Build token is not in the web image");
  });
});

describe("E2E retries and quarantine (BE-17 L10)", () => {
  test("the smoke suite never retries", () => {
    for (const config of readdirSync(resolve(repoRoot, "apps/e2e")).filter((f) =>
      /^playwright\..*config\.ts$/.test(f),
    )) {
      const source = readFileSync(resolve(repoRoot, "apps/e2e", config), "utf8");
      const retries = source.match(/^\s*retries:.*$/gm) ?? [];
      expect(retries.length, config).toBe(1);
      expect(retries[0]?.trim(), config).toBe("retries: 0,");
    }
  });

  test("the quarantine list is well formed and short", () => {
    expect(quarantineProblems()).toEqual([]);
    expect(QUARANTINE.length).toBeLessThanOrEqual(MAX_QUARANTINED);
    const bad = [{ file: "x.ts", title: "", reason: "flaky", since: "last week" }];
    expect(quarantineProblems(bad).length).toBe(4);
  });

  test("the pattern matches the quarantined test only, and nothing when the list is empty", () => {
    expect(quarantinePattern([])).toBeUndefined();
    const pattern = quarantinePattern([
      {
        file: "mortgage.spec.ts",
        title: "shows the payment (monthly)",
        reason: "Fails about one run in ten on the chart animation.",
        since: "2026-11-15",
      },
    ]) as RegExp;
    expect(pattern.test("chromium mortgage.spec.ts Mortgage shows the payment (monthly)")).toBe(
      true,
    );
    expect(pattern.test("chromium mortgage.spec.ts shows the payment (monthly)")).toBe(true);
    expect(
      pattern.test("chromium mortgage.spec.ts Mortgage shows the payment (monthly) twice"),
    ).toBe(false);
    expect(pattern.test("chromium budget.spec.ts shows the payment (monthly)")).toBe(false);
    // Playwright appends tags after the title.
    expect(pattern.test("chromium mortgage.spec.ts shows the payment (monthly) @slow @smoke")).toBe(
      true,
    );
  });

  test("CI names quarantined specs in the job summary", () => {
    const ci = readFileSync(resolve(repoRoot, ".github/workflows/ci-pipeline.yml"), "utf8");
    expect(ci).toContain('bun apps/e2e/quarantine.ts >> "$GITHUB_STEP_SUMMARY"');
    expect(quarantineSummary([])).toContain("No quarantined tests");
  });
});
