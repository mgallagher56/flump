import { describe, expect, test } from "bun:test";
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const SCRIPT = resolve(import.meta.dir, "restore-drill.sh");

// Argument validation runs before Docker is touched, so these need no Docker daemon.
function run(args: string[], env: Record<string, string> = {}) {
  const proc = Bun.spawnSync(["bash", SCRIPT, ...args], {
    env: { ...process.env, OWNER: "", ...env },
    stdout: "pipe",
    stderr: "pipe",
  });
  return {
    exitCode: proc.exitCode,
    stderr: proc.stderr.toString(),
    stdout: proc.stdout.toString(),
  };
}

describe("restore-drill.sh argument checks", () => {
  test("exits 2 with usage when no dump is given", () => {
    const result = run(["--owner", "x"]);
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("usage:");
  });

  test("requires an owner id", () => {
    const result = run([import.meta.path]);
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("owner");
  });

  test("rejects a missing dump file", () => {
    const result = run(["--owner", "x", "/nonexistent/prod.dump"]);
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("dump file not found");
  });

  test.each(["db.example.com", "10.0.0.5", "backend.railway.internal"])(
    "refuses the non-local drill host %s",
    (host) => {
      const result = run(["--owner", "x", import.meta.path], { DRILL_HOST: host });
      expect(result.exitCode).toBe(2);
      expect(result.stderr).toContain("non-local");
    },
  );

  test("refuses a non-local DRILL_URL and a PGURL that names the drill target", () => {
    const remote = run(["--owner", "x", import.meta.path], {
      DRILL_URL: "postgres://u:p@db.example.com:5432/x",
    });
    expect(remote.exitCode).toBe(2);
    expect(remote.stderr).toContain("non-local DRILL_URL");

    const same = run(["--owner", "x", import.meta.path], {
      DRILL_PORT: "55433",
      DRILL_DB: "flump_drill",
      PGURL: "postgres://postgres:pw@localhost:55433/flump_drill",
    });
    expect(same.exitCode).toBe(2);
    expect(same.stderr).toContain("PGURL");

    const equal = run(["--owner", "x", import.meta.path], {
      DRILL_URL: "postgres://u:p@localhost:5432/x",
      PGURL: "postgres://u:p@localhost:5432/x",
    });
    expect(equal.exitCode).toBe(2);
    expect(equal.stderr).toContain("equals PGURL");
  });
});

// Drives the script past the point where the password is in use, with a fake `docker` on PATH
// (no real Docker needed): the container starts with the password, then pg_restore fails and its
// log contains the password. The script must keep that out of stdout/stderr.
describe("restore-drill.sh secrets", () => {
  const PASSWORD = "super-secret-drill-pw";

  test("never echoes the drill password or a connection string, even when the restore fails", () => {
    const dir = mkdtempSync(join(tmpdir(), "drill-test-"));
    try {
      const fake = join(dir, "docker");
      writeFileSync(
        fake,
        `#!/usr/bin/env bash
case "$1" in
  container) exit 1 ;;
  exec)
    case "$*" in
      *pg_restore*) echo "pg_restore: error: password ${PASSWORD} postgres://postgres:${PASSWORD}@localhost/x" >&2; exit 1 ;;
    esac
    exit 0 ;;
  *) exit 0 ;;
esac
`,
      );
      chmodSync(fake, 0o755);
      const out = join(dir, "out", "counts.txt");
      const result = run(["--owner", "x", "--out", out, import.meta.path], {
        PATH: `${dir}:${process.env.PATH ?? ""}`,
        DRILL_PASSWORD: PASSWORD,
        DRILL_USE_DOCKER_TOOLS: "1",
      });
      // It reached the restore step (and failed there), so the password path was exercised.
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain("pg_restore failed");
      const logged = readFileSync(`${out}.restore-error.log`, "utf8");
      expect(logged).toContain(PASSWORD);
      const terminal = result.stdout + result.stderr;
      expect(terminal).not.toContain(PASSWORD);
      expect(terminal).not.toContain("postgres://");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
