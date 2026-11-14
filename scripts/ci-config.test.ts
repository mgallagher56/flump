import { describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

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

describe("supply chain (BE-01 L8, M17)", () => {
  const files = [
    ...[
      "ci-pipeline.yml",
      "security-scan.yml",
      "release-please.yml",
      "visual-regression.yml",
      "backup.yml",
    ].map((f) => `.github/workflows/${f}`),
    ".github/actions/bun-setup/action.yml",
  ];

  test("every third-party action is pinned to a full commit SHA", () => {
    const unpinned = files.flatMap((file) =>
      readFileSync(resolve(repoRoot, file), "utf8")
        .split("\n")
        .filter((line) => /^\s*-?\s*uses:\s/.test(line))
        .filter((line) => !/uses:\s*\.\//.test(line) && !/@[0-9a-f]{40}(\s|$)/.test(line))
        .map((line) => `${file}: ${line.trim()}`),
    );
    expect(unpinned).toEqual([]);
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
