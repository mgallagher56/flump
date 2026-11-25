import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const SCRIPT = resolve(import.meta.dir, "clean-test-dbs.sh");
const BASH = Bun.which("bash") ?? "/bin/bash";
// The script and the fake need only these. PATH holds nothing else, so a real `docker` (on Linux
// runners it sits in /usr/bin) can never be reached, even in the test that removes the fake.
const TOOLS = ["sed", "cat"];

// A fake `docker` on PATH: it records every call and answers `ps` and `volume ls` from fixture
// files, ignoring the filters. So the script's own label checks are what keep it safe here.
const FAKE_DOCKER = `#!${BASH}
printf '%s\\n' "$*" >> "$FAKE_LOG"
case "$1" in
  info) exit "\${FAKE_INFO_EXIT:-0}" ;;
  ps) cat "$FAKE_PS" ;;
  volume) if [ "$2" = ls ]; then cat "$FAKE_VOLUMES"; fi ;;
  rm) if [ -n "\${FAKE_RM_FAIL:-}" ] && [ "$3" = "$FAKE_RM_FAIL" ]; then exit 1; fi ;;
esac
`;

let dir: string;
let live: string;
let gone: string;

type Row = [id: string, name: string, purpose: string, worktree: string];

function setup(containers: Row[], volumes: [name: string, purpose: string, worktree: string][]) {
  writeFileSync(join(dir, "ps"), containers.map((r) => `${r.join("|")}\n`).join(""));
  writeFileSync(join(dir, "volumes"), volumes.map((r) => `${r.join("|")}\n`).join(""));
}

function run(args: string[], env: Record<string, string> = {}) {
  const proc = Bun.spawnSync([BASH, SCRIPT, ...args], {
    env: {
      ...process.env,
      PATH: `${join(dir, "bin")}:${join(dir, "tools")}`,
      FAKE_LOG: join(dir, "log"),
      FAKE_PS: join(dir, "ps"),
      FAKE_VOLUMES: join(dir, "volumes"),
      ...env,
    },
    stdout: "pipe",
    stderr: "pipe",
  });
  return {
    exitCode: proc.exitCode,
    stdout: proc.stdout.toString(),
    stderr: proc.stderr.toString(),
  };
}

const calls = () => {
  try {
    return readFileSync(join(dir, "log"), "utf8").trim().split("\n").filter(Boolean);
  } catch {
    return [];
  }
};
const removals = () => calls().filter((c) => c.startsWith("rm ") || c.startsWith("volume rm "));

beforeEach(() => {
  // Labels hold the resolved path (git rev-parse --show-toplevel), so the fixtures do too.
  dir = realpathSync(mkdtempSync(join(tmpdir(), "clean-test-dbs-")));
  mkdirSync(join(dir, "bin"));
  mkdirSync(join(dir, "tools"));
  for (const tool of TOOLS) {
    const path = Bun.which(tool);
    if (!path) throw new Error(`${tool} not found`);
    symlinkSync(path, join(dir, "tools", tool));
  }
  writeFileSync(join(dir, "bin", "docker"), FAKE_DOCKER);
  chmodSync(join(dir, "bin", "docker"), 0o755);
  live = join(dir, "worktrees", "live-lane");
  mkdirSync(live, { recursive: true });
  gone = join(dir, "worktrees", "gone-lane");
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("clean-test-dbs.sh for one worktree", () => {
  test("removes only the containers and volumes labelled with that worktree", () => {
    setup(
      [
        ["c1", "flump-live-pg", "test-db", live],
        ["c2", "flump-other-pg", "test-db", gone],
        ["c3", "flump-live-redis", "cache", live],
      ],
      [
        ["v1", "test-db", live],
        ["v2", "test-db", gone],
      ],
    );
    const result = run([live]);
    expect(result.exitCode).toBe(0);
    expect(removals()).toEqual(["rm -fv c1", "volume rm v1"]);
    expect(result.stdout).toContain("removed container flump-live-pg");
    expect(result.stdout).toContain("removed volume v1");
  });

  test("asks Docker only for test databases", () => {
    setup([], []);
    run([live]);
    expect(calls().filter((c) => c.startsWith("ps ") || c.startsWith("volume ls "))).toEqual([
      expect.stringContaining("--filter label=flump.purpose=test-db"),
      expect.stringContaining("--filter label=flump.purpose=test-db"),
    ]);
  });

  test("a trailing slash on the path still matches", () => {
    setup([["c1", "flump-live-pg", "test-db", live]], []);
    expect(run([`${live}/`]).exitCode).toBe(0);
    expect(removals()).toEqual(["rm -fv c1"]);
  });

  test("a symlinked or unresolved path to an existing worktree matches its resolved label", () => {
    setup([["c1", "flump-live-pg", "test-db", live]], []);
    symlinkSync(live, join(dir, "link"));
    expect(run([join(dir, "link")]).exitCode).toBe(0);
    expect(run([`${dir}/worktrees/../worktrees/live-lane`]).exitCode).toBe(0);
    expect(removals()).toEqual(["rm -fv c1", "rm -fv c1"]);
  });

  test("never removes a volume named for the dev database, even when it carries the labels", () => {
    setup(
      [],
      [
        ["flump-postgres-data", "test-db", live],
        ["v1", "test-db", live],
      ],
    );
    const result = run([live]);
    expect(removals()).toEqual(["volume rm v1"]);
    expect(result.stderr).toContain("skipping flump-postgres-data");
  });

  test("never removes flump-postgres, even when it carries the labels", () => {
    setup(
      [
        ["c0", "flump-postgres", "test-db", live],
        ["c1", "flump-live-pg", "test-db", live],
      ],
      [],
    );
    const result = run([live]);
    expect(removals()).toEqual(["rm -fv c1"]);
    expect(result.stderr).toContain("skipping flump-postgres");
  });

  test("ignores unlabelled containers and volumes", () => {
    setup(
      [
        ["c1", "flump-adhoc-pg", "", ""],
        ["c2", "flump-half-pg", "", live],
      ],
      [["v1", "", live]],
    );
    const result = run([live]);
    expect(result.exitCode).toBe(0);
    expect(removals()).toEqual([]);
    expect(result.stdout).toContain(`nothing to clean for ${live}`);
  });

  test("--dry-run lists what it would remove and removes nothing", () => {
    setup([["c1", "flump-live-pg", "test-db", live]], [["v1", "test-db", live]]);
    const result = run(["--dry-run", live]);
    expect(result.exitCode).toBe(0);
    expect(removals()).toEqual([]);
    expect(result.stdout).toContain("would remove container flump-live-pg (c1)");
    expect(result.stdout).toContain("would remove volume v1");
  });

  test("keeps going after a failed removal and exits 1", () => {
    setup(
      [
        ["c1", "flump-live-pg", "test-db", live],
        ["c2", "flump-live2-pg", "test-db", live],
      ],
      [],
    );
    const result = run([live], { FAKE_RM_FAIL: "c1" });
    expect(result.exitCode).toBe(1);
    expect(removals()).toEqual(["rm -fv c1", "rm -fv c2"]);
    expect(result.stderr).toContain("could not remove container flump-live-pg");
  });

  test.each([
    ["a relative path", ["some/lane"]],
    ["the root", ["/"]],
    ["no path", []],
    ["two paths", ["/a", "/b"]],
    ["a path and --orphans", ["--orphans", "/a"]],
    ["an unknown option", ["--force", "/a"]],
  ])("refuses %s with usage", (_name, args) => {
    setup([["c1", "flump-live-pg", "test-db", live]], []);
    const result = run(args);
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("usage:");
    expect(calls()).toEqual([]);
  });
});

describe("clean-test-dbs.sh --orphans", () => {
  test("removes labelled containers and volumes whose worktree no longer exists", () => {
    setup(
      [
        ["c1", "flump-live-pg", "test-db", live],
        ["c2", "flump-gone-pg", "test-db", gone],
        ["c3", "flump-adhoc-pg", "", ""],
        ["c4", "flump-nolabel-pg", "test-db", ""],
        ["c5", "flump-relative-pg", "test-db", "worktrees/x"],
        ["c6", "flump-postgres", "test-db", gone],
      ],
      [
        ["v1", "test-db", live],
        ["v2", "test-db", gone],
        ["v3", "test-db", ""],
      ],
    );
    const result = run(["--orphans"]);
    expect(result.exitCode).toBe(0);
    expect(removals()).toEqual(["rm -fv c2", "volume rm v2"]);
    expect(result.stdout).toContain(`removed container flump-gone-pg (worktree ${gone} is gone)`);
  });

  test("--orphans --dry-run removes nothing", () => {
    setup([["c2", "flump-gone-pg", "test-db", gone]], [["v2", "test-db", gone]]);
    const result = run(["--orphans", "--dry-run"]);
    expect(result.exitCode).toBe(0);
    expect(removals()).toEqual([]);
    expect(result.stdout).toContain("would remove container flump-gone-pg (c2)");
    expect(result.stdout).toContain("would remove volume v2");
  });
});

describe("clean-test-dbs.sh without Docker", () => {
  test("exits 0 when the docker command is missing, since nothing can be running", () => {
    rmSync(join(dir, "bin", "docker"));
    const result = run([live]);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain("docker not found");
  });

  test("exits 1 when the daemon is not reachable", () => {
    setup([["c1", "flump-live-pg", "test-db", live]], []);
    const result = run([live], { FAKE_INFO_EXIT: "1" });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("daemon");
    expect(removals()).toEqual([]);
  });
});
