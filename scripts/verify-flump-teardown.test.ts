import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

// verify-flump runs against a throwaway copy of the repo layout (fake build output, a git repo
// for the worktree label) and a fake `docker` that records calls. Migrations then fail for real
// (the fake backend has no package.json), which is the failed `up` these tests need.
const SOURCE = resolve(import.meta.dir, "../.claude/skills/verify-flump/scripts/verify-flump");

const FAKE_DOCKER = `#!/usr/bin/env bash
printf '%s\\n' "$*" >> "$FAKE_LOG"
case "$1" in
  info|run|rm) exit 0 ;;
  exec) exit "\${FAKE_EXEC_EXIT:-0}" ;;
  logs) echo "PostgreSQL init process complete" ;;
esac
`;

let dir: string;
let repo: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "verify-flump-teardown-"));
  repo = join(dir, "repo");
  const scripts = join(repo, ".claude/skills/verify-flump/scripts");
  mkdirSync(scripts, { recursive: true });
  copyFileSync(SOURCE, join(scripts, "verify-flump"));
  for (const sub of ["apps/web/build/server", "apps/backend/dist", "apps/marketing/dist"]) {
    mkdirSync(join(repo, sub), { recursive: true });
  }
  mkdirSync(join(repo, "apps/e2e/node_modules/@playwright/test"), { recursive: true });
  writeFileSync(join(repo, "apps/web/build/server/index.js"), "");
  writeFileSync(join(repo, "apps/backend/dist/main.js"), "");
  Bun.spawnSync(["git", "init", "-q", repo]);
  Bun.spawnSync([
    "git",
    "-C",
    repo,
    "-c",
    "user.email=t@t",
    "-c",
    "user.name=t",
    "commit",
    "-q",
    "--allow-empty",
    "-m",
    "x",
  ]);
  mkdirSync(join(dir, "bin"));
  writeFileSync(join(dir, "bin", "docker"), FAKE_DOCKER);
  chmodSync(join(dir, "bin", "docker"), 0o755);
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function start(env: Record<string, string> = {}) {
  return Bun.spawn(
    ["bash", join(repo, ".claude/skills/verify-flump/scripts/verify-flump"), "up", "--skip-build"],
    {
      env: {
        ...process.env,
        PATH: `${join(dir, "bin")}:${process.env.PATH}`,
        FAKE_LOG: join(dir, "log"),
        VERIFY_ROOT: join(dir, "verify"),
        VERIFY_EVIDENCE_ROOT: join(dir, "evidence"),
        ...env,
      },
      stdout: "pipe",
      stderr: "pipe",
    },
  );
}

const calls = () =>
  existsSync(join(dir, "log")) ? readFileSync(join(dir, "log"), "utf8").trim().split("\n") : [];
const liveRuns = () =>
  existsSync(join(dir, "verify/state")) ? readdirSync(join(dir, "verify/state")) : [];

describe("verify-flump up", () => {
  test("labels its database with the worktree, and a failed up removes it with its volumes", async () => {
    const proc = start();
    const stderr = await new Response(proc.stderr).text();
    expect(await proc.exited).toBe(1);
    expect(stderr).toContain("migrations failed");

    const run = calls().find((c) => c.startsWith("run "));
    expect(run).toContain("--label flump.purpose=test-db");
    expect(run).toContain(`--label flump.worktree=${realpathSync(repo)} `);
    const name = run?.match(/--name (flump-verify-\S+-pg)/)?.[1];
    expect(name).toBeDefined();
    expect(calls()).toContain(`rm -fv ${name}`);
    expect(liveRuns()).toEqual([]);
  });

  test.each([
    ["SIGINT", 130],
    ["SIGTERM", 143],
  ] as const)("an up interrupted by %s tears its run down", async (signal, code) => {
    // Postgres never answers, so up sits in its readiness loop until the signal.
    const proc = start({ FAKE_EXEC_EXIT: "1" });
    while (!calls().some((c) => c.startsWith("exec "))) await Bun.sleep(50);
    proc.kill(signal);
    expect(await proc.exited).toBe(code);

    const name = calls()
      .find((c) => c.startsWith("run "))
      ?.match(/--name (flump-verify-\S+-pg)/)?.[1];
    expect(calls()).toContain(`rm -fv ${name}`);
    expect(liveRuns()).toEqual([]);
  });
});
