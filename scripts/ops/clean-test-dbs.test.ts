import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
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
import { isolatedPath } from "../lib/fake-bin";

const SCRIPT = resolve(import.meta.dir, "clean-test-dbs.sh");
const BASH = Bun.which("bash") ?? "/bin/bash";
// PATH is isolatedPath (scripts/lib/fake-bin.ts): the fake plus the shell tools, so a real
// `docker` (on Linux runners it sits in /usr/bin) can never be reached, even in the test that
// removes the fake.

// A fake `docker` on PATH: it records every call and answers `ps` and `volume ls` from fixture
// files, ignoring the filters. So the script's own label checks are what keep it safe here.
// `context inspect` answers with $FAKE_ENDPOINT. A leading `--host <endpoint>` is logged, then
// skipped, so the tests can check every daemon call goes to the OrbStack socket.
const FAKE_DOCKER = `#!${BASH}
printf '%s\\n' "$*" >> "$FAKE_LOG"
if [ "$1" = --host ]; then shift 2; fi
case "$1" in
  context) if [ -n "\${FAKE_ENDPOINT+x}" ]; then printf '%s\\n' "$FAKE_ENDPOINT"; else exit 1; fi ;;
  info) exit "\${FAKE_INFO_EXIT:-0}" ;;
  ps) cat "$FAKE_PS" ;;
  volume) if [ "$2" = ls ]; then cat "$FAKE_VOLUMES"; fi ;;
  rm) if [ -n "\${FAKE_RM_FAIL:-}" ] && [ "$3" = "$FAKE_RM_FAIL" ]; then exit 1; fi ;;
esac
`;

let dir: string;
let home: string;
let socket: string;
let live: string;
let gone: string;
let bin: string;

type Row = [id: string, name: string, purpose: string, worktree: string];

function setup(containers: Row[], volumes: [name: string, purpose: string, worktree: string][]) {
  writeFileSync(join(dir, "ps"), containers.map((r) => `${r.join("|")}\n`).join(""));
  writeFileSync(join(dir, "volumes"), volumes.map((r) => `${r.join("|")}\n`).join(""));
}

function run(args: string[], env: Record<string, string | undefined> = {}, cwd?: string) {
  // CI runners set CI, and a developer may have DOCKER_HOST or DOCKER_CONTEXT set; each test
  // starts without them and sets them only on purpose.
  const {
    CI: _ci,
    GITHUB_ACTIONS: _gha,
    DOCKER_HOST: _host,
    DOCKER_CONTEXT: _context,
    ...base
  } = process.env;
  const merged: Record<string, string | undefined> = {
    ...base,
    HOME: home,
    PATH: bin,
    FAKE_ENDPOINT: `unix://${socket}`,
    FAKE_LOG: join(dir, "log"),
    FAKE_PS: join(dir, "ps"),
    FAKE_VOLUMES: join(dir, "volumes"),
    ...env,
  };
  for (const key of Object.keys(merged)) if (merged[key] === undefined) delete merged[key];
  const proc = Bun.spawnSync([BASH, SCRIPT, ...args], {
    cwd,
    env: merged as Record<string, string>,
    stdout: "pipe",
    stderr: "pipe",
  });
  return {
    exitCode: proc.exitCode,
    stdout: proc.stdout.toString(),
    stderr: proc.stderr.toString(),
  };
}

const rawCalls = () => {
  try {
    return readFileSync(join(dir, "log"), "utf8").trim().split("\n").filter(Boolean);
  } catch {
    return [];
  }
};
const calls = () => rawCalls().map((c) => c.replace(`--host unix://${socket} `, ""));
const removals = () => calls().filter((c) => c.startsWith("rm ") || c.startsWith("volume rm "));

beforeEach(() => {
  // Labels hold the resolved path (git rev-parse --show-toplevel), so the fixtures do too.
  dir = realpathSync(mkdtempSync(join(tmpdir(), "clean-test-dbs-")));
  bin = isolatedPath(dir, { fakes: { docker: FAKE_DOCKER } });
  home = join(dir, "home");
  mkdirSync(join(home, ".orbstack", "run"), { recursive: true });
  socket = join(home, ".orbstack", "run", "docker.sock");
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
    rmSync(join(bin, "docker"));
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

describe("clean-test-dbs.sh acts only on the local OrbStack Docker", () => {
  test("sends every daemon call to the OrbStack socket by --host, after reading the orbstack context", () => {
    setup([["c1", "flump-live-pg", "test-db", live]], [["v1", "test-db", live]]);
    expect(run([live]).exitCode).toBe(0);
    const [inspect, ...daemon] = rawCalls();
    expect(inspect).toBe("context inspect orbstack --format {{.Endpoints.docker.Host}}");
    expect(daemon.length).toBe(5); // info, ps, rm, volume ls, volume rm
    for (const call of daemon) expect(call.startsWith(`--host unix://${socket} `)).toBe(true);
  });

  test("runs when DOCKER_CONTEXT is orbstack or DOCKER_HOST is the OrbStack socket", () => {
    setup([["c1", "flump-live-pg", "test-db", live]], []);
    expect(run([live], { DOCKER_CONTEXT: "orbstack" }).exitCode).toBe(0);
    expect(run([live], { DOCKER_HOST: `unix://${socket}` }).exitCode).toBe(0);
    expect(removals()).toEqual(["rm -fv c1", "rm -fv c1"]);
  });

  const refused = (result: ReturnType<typeof run>, ...calls: string[]) => {
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("refusing");
    expect(rawCalls()).toEqual(calls);
  };
  const inspect = "context inspect orbstack --format {{.Endpoints.docker.Host}}";

  test.each([
    ["CI", { CI: "true" }],
    ["CI, even with --dry-run", { CI: "1" }],
    ["GitHub Actions, even with CI cleared", { CI: "", GITHUB_ACTIONS: "true" }],
  ])("refuses to run in %s and calls no docker at all", (_name, env) => {
    setup([["c1", "flump-live-pg", "test-db", live]], []);
    refused(run(["--dry-run", live], env));
  });

  test("refuses in CI before the docker-missing early exit", () => {
    rmSync(join(bin, "docker"));
    expect(run([live], { CI: "true" }).exitCode).toBe(1);
  });

  test.each([
    ["tcp://", "tcp://10.0.0.5:2375"],
    ["ssh://", "ssh://deploy@build-box"],
    ["the default socket", "unix:///var/run/docker.sock"],
    ["Docker Desktop's socket", "unix://HOME/.docker/run/docker.sock"],
  ])("refuses DOCKER_HOST set to %s", (_name, value) => {
    setup([["c1", "flump-live-pg", "test-db", live]], []);
    refused(run([live], { DOCKER_HOST: value.replace("HOME", home) }));
  });

  test.each(["desktop-linux", "default", "remote"])("refuses DOCKER_CONTEXT=%s", (context) => {
    setup([["c1", "flump-live-pg", "test-db", live]], []);
    refused(run([live], { DOCKER_CONTEXT: context }));
  });

  test("refuses, without falling back to another context, when there is no orbstack context", () => {
    setup([["c1", "flump-live-pg", "test-db", live]], []);
    refused(run([live], { FAKE_ENDPOINT: undefined }), inspect);
  });

  test.each([
    ["tcp://", "tcp://10.0.0.5:2375"],
    ["ssh://", "ssh://deploy@build-box"],
    ["the default socket", "unix:///var/run/docker.sock"],
    ["a socket outside the home .orbstack directory", "unix://HOME/.docker/run/docker.sock"],
    ["a look-alike directory", "unix://HOME/.orbstack-evil/docker.sock"],
    ["a .. escape", "unix://HOME/.orbstack/../.docker/run/docker.sock"],
    ["an empty endpoint", ""],
    ["a second line", "unix://HOME/.orbstack/run/docker.sock\ntcp://10.0.0.5:2375"],
  ])("refuses an orbstack context whose endpoint is %s", (_name, endpoint) => {
    setup([["c1", "flump-live-pg", "test-db", live]], []);
    // The directories exist, so only the endpoint check can refuse, not a failed cd.
    mkdirSync(join(home, ".orbstack-evil"));
    mkdirSync(join(home, ".docker", "run"), { recursive: true });
    refused(run([live], { FAKE_ENDPOINT: endpoint.replaceAll("HOME", home) }), inspect);
  });

  test("refuses a socket path that is a symlink out of the home .orbstack directory", () => {
    setup([["c1", "flump-live-pg", "test-db", live]], []);
    mkdirSync(join(home, ".docker", "run"), { recursive: true });
    symlinkSync(join(home, ".docker", "run"), join(home, ".orbstack", "elsewhere"));
    refused(
      run([live], {
        FAKE_ENDPOINT: `unix://${join(home, ".orbstack", "elsewhere", "docker.sock")}`,
      }),
      inspect,
    );
    symlinkSync(
      join(home, ".docker", "run", "docker.sock"),
      join(home, ".orbstack", "run", "linked.sock"),
    );
    rmSync(join(dir, "log"));
    refused(
      run([live], { FAKE_ENDPOINT: `unix://${join(home, ".orbstack", "run", "linked.sock")}` }),
      inspect,
    );
  });

  test("refuses when HOME is not an absolute path, even if it leads to a real .orbstack", () => {
    setup([["c1", "flump-live-pg", "test-db", live]], []);
    // Run from dir, where the relative "home" holds a real .orbstack/run.
    refused(run([live], { HOME: "home" }, dir), inspect);
    rmSync(join(dir, "log"));
    refused(run([live], { HOME: undefined }), inspect);
  });
});
