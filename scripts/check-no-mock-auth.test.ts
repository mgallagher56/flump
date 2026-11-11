import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

const SCRIPT = resolve(import.meta.dir, "check-no-mock-auth.sh");

type Result = { exitCode: number; stdout: string; stderr: string };

// Fixtures are built in a temp directory at run time, not committed: a committed
// `*.test.ts` fixture would be collected by `bun test`, and fixture files holding
// the literals would show up in repo-wide searches for them. The roots are absolute
// so the script's repo-relative allow-list can never match a fixture by accident.
let root: string;

function writeFixture(relativePath: string, content: string): string {
  const file = join(root, relativePath);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
  return file;
}

function runCheck(scanRoots: string): Result {
  const proc = Bun.spawnSync(["bash", SCRIPT], {
    env: { ...process.env, SCAN_ROOTS: scanRoots },
    stdout: "pipe",
    stderr: "pipe",
  });
  return {
    exitCode: proc.exitCode,
    stdout: proc.stdout.toString(),
    stderr: proc.stderr.toString(),
  };
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "check-no-mock-auth-"));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("check-no-mock-auth.sh", () => {
  test("exits 0 and prints OK when no literal is present", () => {
    writeFixture("src/clean.ts", "export const token = 'real';\n");

    const result = runCheck(root);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("OK:");
  });

  test("exits 1 and names file:line when mock-session-token appears in a non-allowed file", () => {
    const file = writeFixture("src/bypass.ts", "const t = 'mock-session-token';\n");

    const result = runCheck(root);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Mock auth literals found");
    expect(result.stderr).toContain(`${file}:1:`);
  });

  test.each(["mock-session-token", "dev_user_123", "user_mock", "mock_mcp_key"])(
    "flags the literal %s",
    (literal) => {
      const file = writeFixture("src/leak.ts", `// ok\nconst x = '${literal}';\n`);

      const result = runCheck(root);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain(`${file}:2:`);
    },
  );

  test("allows *.test.* and *.spec.* files", () => {
    writeFixture("src/foo.test.ts", "const u = 'dev_user_123';\n");
    writeFixture("src/bar.spec.tsx", "const u = 'user_mock';\n");

    const result = runCheck(root);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("OK:");
  });

  test("allow-lists the RemoveSeededExampleData migration, which must name the retired mock ids", () => {
    const migration = "apps/backend/src/migrations/RemoveSeededExampleData1794355400000.ts";
    // The migration really contains a literal, so passing proves the allow-list entry works.
    expect(readFileSync(resolve(import.meta.dir, "..", migration), "utf8")).toMatch(
      /user_mock|dev_user_123/,
    );

    const result = runCheck("apps/backend/src/migrations");

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("OK:");
  });

  test("still fails when an allowed file and a non-allowed file both match", () => {
    writeFixture("src/foo.test.ts", "const u = 'dev_user_123';\n");
    const bad = writeFixture("src/bad.ts", "const u = 'dev_user_123';\n");

    const result = runCheck(root);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain(bad);
    expect(result.stderr).not.toContain("foo.test.ts:");
  });

  test("ignores excluded directories such as node_modules", () => {
    writeFixture("node_modules/pkg/index.js", "const u = 'dev_user_123';\n");
    writeFixture("dist/out.js", "const u = 'mock-session-token';\n");

    const result = runCheck(root);

    expect(result.exitCode).toBe(0);
  });

  test("exits 2 on scan error instead of reporting OK", () => {
    const result = runCheck(join(root, "does-not-exist"));

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("scan failed");
    expect(result.stdout).not.toContain("OK:");
  });
});
