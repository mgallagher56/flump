import { describe, expect, test } from "bun:test";
import { resolve } from "node:path";

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

  test("never echoes the drill password or a connection string", () => {
    const result = run(["--owner", "x", import.meta.path], {
      DRILL_HOST: "db.example.com",
      DRILL_PASSWORD: "super-secret-drill-pw",
    });
    expect(result.stdout + result.stderr).not.toContain("super-secret-drill-pw");
    expect(result.stdout + result.stderr).not.toContain("postgres://");
  });
});
