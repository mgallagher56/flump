import { afterAll, describe, expect, test } from "bun:test";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const SCRIPT = resolve(import.meta.dir, "backup-dump.sh");
const PGURL = "postgres://prod_user:s3cretprodpw@prod.example.com:5432/flump";

const work = mkdtempSync(join(tmpdir(), "backup-dump-test-"));
afterAll(() => rmSync(work, { recursive: true, force: true }));

function stub(name: string, body: string): string {
  const path = join(work, name);
  writeFileSync(path, `#!/usr/bin/env bash\n${body}\n`);
  chmodSync(path, 0o755);
  return path;
}

// pg_dump stand-in: writes fake dump bytes; fails (echoing the URL, as a real tool might) when
// STUB_DUMP_FAIL=1. pg_restore --list stand-in: three TABLE DATA entries.
const stubDump = stub(
  "pg_dump-stub",
  `if [ "\${STUB_DUMP_FAIL:-0}" = 1 ]; then echo "connection to $1 failed" >&2; exit 1; fi
echo "-- fake dump"`,
);
const stubList = stub(
  "pg_restore-stub",
  `cat >/dev/null
printf '1; 0 0 TABLE public a x\\n2; 0 0 TABLE DATA public a x\\n3; 0 0 TABLE DATA public b x\\n4; 0 0 TABLE DATA public c x\\n'`,
);

function run(args: string[], env: Record<string, string | undefined> = {}) {
  const home = mkdtempSync(join(work, "home-"));
  const proc = Bun.spawnSync([Bun.which("bash") ?? "bash", SCRIPT, ...args], {
    env: {
      ...process.env,
      HOME: home,
      PGURL,
      OWNER: "",
      PG_DUMP: stubDump,
      PG_RESTORE: stubList,
      ...env,
    },
    stdout: "pipe",
    stderr: "pipe",
  });
  return {
    exitCode: proc.exitCode,
    out: proc.stdout.toString() + proc.stderr.toString(),
    stdout: proc.stdout.toString(),
    stderr: proc.stderr.toString(),
    home,
  };
}

function expectNoSecrets(out: string) {
  expect(out).not.toContain("s3cretprodpw");
  expect(out).not.toContain(PGURL);
}

describe("backup-dump.sh refusals (no database)", () => {
  test("refuses without PGURL, creating nothing", () => {
    const r = run([], { PGURL: "" });
    expect(r.exitCode).toBe(2);
    expect(r.stderr).toContain("PGURL is required");
    expect(existsSync(join(r.home, "flump-backups"))).toBe(false);
  });

  test("refuses a PGURL that is not a postgres URL, without echoing it", () => {
    const r = run([], { PGURL: "mysql://u:s3cretprodpw@h/db" });
    expect(r.exitCode).toBe(2);
    expect(r.stderr).toContain("must be a postgres:// URL");
    expectNoSecrets(r.out);
    expect(r.out).not.toContain("mysql://");
  });

  test("rejects unknown flags, a bad label and a malformed age recipient", () => {
    expect(run(["--nope"]).exitCode).toBe(2);
    expect(run(["--label", "../etc"]).stderr).toContain("--label");
    const r = run(["--age-recipient", "ssh-rsa AAAA"]);
    expect(r.exitCode).toBe(2);
    expect(r.stderr).toContain("age public key");
  });

  test("refuses --age-recipient when the age tool is missing instead of writing plaintext only", () => {
    // PATH holds only dirname, so `age` cannot be found.
    const bin = join(work, "bin-no-age");
    mkdirSync(bin, { recursive: true });
    symlinkSync(Bun.which("dirname") ?? "/usr/bin/dirname", join(bin, "dirname"), "file");
    const r = run(
      ["--age-recipient", "age1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq"],
      {
        PATH: bin,
      },
    );
    expect(r.exitCode).toBe(2);
    expect(r.stderr).toContain("needs the 'age' tool");
    expect(existsSync(join(r.home, "flump-backups"))).toBe(false);
  });

  test("refuses when pg_dump is not installed", () => {
    const r = run([], { PG_DUMP: "definitely-not-a-real-pg-dump" });
    expect(r.exitCode).toBe(2);
    expect(r.stderr).toContain("required tool not found");
  });
});

describe("backup-dump.sh output (stub tools)", () => {
  test("writes private files, counts TABLE DATA and never prints PGURL", () => {
    const outDir = join(work, "backups-ok");
    const r = run(["--out-dir", outDir, "--label", "pre-test"]);
    expect(r.exitCode).toBe(0);
    expectNoSecrets(r.out);
    expect(r.stdout).toContain("table_data_entries: 3");
    expect(r.stdout).toMatch(/dump_seconds: \d+/);
    expect(statSync(outDir).mode & 0o777).toBe(0o700);
    const files = readdirSync(outDir).sort();
    expect(files.some((f) => /^flump-pre-test-\d{8}T\d{6}Z\.dump$/.test(f))).toBe(true);
    expect(files.some((f) => f.endsWith(".schema.sql"))).toBe(true);
    expect(files.some((f) => f.endsWith(".sha256"))).toBe(true);
    expect(files.some((f) => f.includes("partial") || f.includes(".tmp"))).toBe(false);
    for (const f of files) expect(statSync(join(outDir, f)).mode & 0o777).toBe(0o600);
    const sums = readFileSync(join(outDir, files.find((f) => f.endsWith(".sha256")) ?? ""), "utf8");
    expect(sums).toMatch(/^[0-9a-f]{64} +flump-pre-test-.*\.dump$/m);
    expect(sums).not.toContain("sha256 ");
  });

  test("a failing pg_dump leaves no dump and its error is shown with the URL redacted", () => {
    const outDir = join(work, "backups-fail");
    const r = run(["--out-dir", outDir], { STUB_DUMP_FAIL: "1" });
    expect(r.exitCode).toBe(1);
    expect(r.stderr).toContain("pg_dump failed");
    expect(r.stderr).toContain("[redacted]");
    expectNoSecrets(r.out);
    expect(readdirSync(outDir).filter((f) => f.endsWith(".dump"))).toEqual([]);
  });

  test("--age-recipient also writes an encrypted copy", () => {
    const bin = join(work, "bin-age");
    mkdirSync(bin, { recursive: true });
    const age = join(bin, "age");
    writeFileSync(age, `#!/usr/bin/env bash\ncp "\${@: -1}" "\${@: -2:1}"\n`);
    chmodSync(age, 0o755);
    const outDir = join(work, "backups-age");
    const r = run(
      [
        "--out-dir",
        outDir,
        "--age-recipient",
        "age1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq",
      ],
      { PATH: `${bin}:${process.env.PATH ?? ""}` },
    );
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain("encrypted_file:");
    expect(readdirSync(outDir).some((f) => f.endsWith(".dump.age"))).toBe(true);
  });
});
