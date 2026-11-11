import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { run } from "./check-audit";
import { type AllowEntry, evaluateAudit } from "./lib/audit";

const here = import.meta.dir;
const today = "2026-11-11";
const real = JSON.parse(readFileSync(join(here, "__fixtures__/audit/real-sample.json"), "utf8"));

const adv = (severity: string, id = 1, ghsa = "GHSA-aaaa-bbbb-cccc") => ({
  id,
  url: `https://github.com/advisories/${ghsa}`,
  title: "Bad thing",
  severity,
  vulnerable_versions: "<1.0.0",
});
const entry = (over: Partial<AllowEntry> = {}): AllowEntry => ({
  id: "GHSA-aaaa-bbbb-cccc",
  package: "foo",
  severity: "high",
  reason: "no fix yet",
  expires: "2026-12-01",
  ...over,
});
const opts = { threshold: "high" as const, today };

describe("evaluateAudit", () => {
  test("real bun audit sample (moderate only) passes", () => {
    expect(evaluateAudit(real, [], opts)).toEqual({ failures: [], warnings: [] });
  });
  test("unallow-listed high fails using the advisory id", () => {
    const r = evaluateAudit({ foo: [adv("high")] }, [], opts);
    expect(r.failures).toHaveLength(1);
    expect(r.failures[0]).toContain("GHSA-aaaa-bbbb-cccc");
  });
  test("critical fails", () => {
    expect(evaluateAudit({ foo: [adv("critical")] }, [], opts).failures).toHaveLength(1);
  });
  test("allow-listed passes (by GHSA or numeric id)", () => {
    expect(evaluateAudit({ foo: [adv("high")] }, [entry()], opts).failures).toEqual([]);
    expect(evaluateAudit({ foo: [adv("high")] }, [entry({ id: "1" })], opts).failures).toEqual([]);
  });
  test("allow entry for a different package does not cover", () => {
    expect(
      evaluateAudit({ foo: [adv("high")] }, [entry({ package: "bar" })], opts).failures.length,
    ).toBeGreaterThan(0);
  });
  test("expired entry fails and no longer covers", () => {
    const r = evaluateAudit({ foo: [adv("high")] }, [entry({ expires: "2026-11-10" })], opts);
    expect(r.failures.some((f) => f.includes("expired"))).toBe(true);
    expect(r.failures.some((f) => f.startsWith("high advisory"))).toBe(true);
  });
  test("expiry day itself is still valid", () => {
    expect(
      evaluateAudit({ foo: [adv("high")] }, [entry({ expires: today })], opts).failures,
    ).toEqual([]);
  });
  test("invalid or too-distant expiry fails", () => {
    expect(evaluateAudit({}, [entry({ expires: "soon" })], opts).failures[0]).toContain("invalid");
    expect(evaluateAudit({}, [entry({ expires: "2027-06-01" })], opts).failures[0]).toContain(
      "90 days",
    );
  });
  test("stale entry warns", () => {
    const r = evaluateAudit({}, [entry()], opts);
    expect(r.failures).toEqual([]);
    expect(r.warnings[0]).toContain("no longer appears");
  });
  test("below threshold ignored", () => {
    expect(evaluateAudit({ foo: [adv("moderate"), adv("low")] }, [], opts).failures).toEqual([]);
  });
  test("bad shape throws", () => {
    expect(() => evaluateAudit(null, [], opts)).toThrow();
    expect(() => evaluateAudit([], [], opts)).toThrow();
    expect(() => evaluateAudit({ foo: "x" }, [], opts)).toThrow();
    expect(() => evaluateAudit({ foo: [adv("catastrophic")] }, [], opts)).toThrow();
  });
});

describe("check-audit CLI", () => {
  const dir = mkdtempSync(join(tmpdir(), "audit-"));
  const write = (name: string, data: unknown) => {
    const f = join(dir, name);
    writeFileSync(f, typeof data === "string" ? data : JSON.stringify(data));
    return f;
  };
  const allowFile = write("allow.json", []);
  const cli = (stdout: string, allow = allowFile, error?: string) => {
    const logs: string[] = [];
    const code = run({
      runner: () => ({ stdout, error }),
      allowFile: allow,
      today,
      log: (m) => logs.push(m),
    });
    return { code, logs };
  };

  test("non-zero bun exit with valid JSON is still evaluated (fails on high)", () => {
    expect(cli(JSON.stringify({ foo: [adv("high")] })).code).toBe(1);
  });
  test("passes on clean report", () => {
    expect(cli("{}").code).toBe(0);
  });
  test("unparseable output and spawn errors exit 2", () => {
    expect(cli("").code).toBe(2);
    expect(cli("not json").code).toBe(2);
    expect(cli("", allowFile, "ENOENT").code).toBe(2);
  });
  test("unrecognised shape exits 2", () => {
    expect(cli("[]").code).toBe(2);
  });
  test("missing allow-list exits 2", () => {
    expect(cli("{}", join(dir, "missing.json")).code).toBe(2);
  });
  test("real script honours AUDIT_COMMAND_JSON_FILE", () => {
    const bad = write("bad.json", { foo: [adv("high")] });
    const proc = Bun.spawnSync(["bun", resolve(here, "check-audit.ts")], {
      env: { ...process.env, AUDIT_COMMAND_JSON_FILE: bad },
      stdout: "pipe",
      stderr: "pipe",
    });
    expect(proc.exitCode).toBe(1);
  });
});
