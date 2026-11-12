import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  type Context,
  type Evidence,
  evaluateAll,
  evaluateEvidence,
  evaluateItem,
  exitCodeFor,
  isStrict,
  loadReadiness,
  parseChecklist,
  renderMarkdown,
} from "./lib/launch-readiness";

const repoRoot = resolve(import.meta.dir, "..");

function fixtureContext(exitCodes: Record<string, number> = {}): Context {
  const root = mkdtempSync(join(tmpdir(), "launch-readiness-"));
  mkdirSync(join(root, "src"));
  writeFileSync(join(root, "src/a.ts"), "export const label = 'PLACEHOLDER';\n");
  writeFileSync(join(root, "src/a.test.ts"), "PLACEHOLDER in a test\n");
  writeFileSync(join(root, "doc.md"), "hello\n");
  return { root, runScript: (script) => exitCodes[script] ?? 1 };
}

describe("evidence kinds", () => {
  const ctx = fixtureContext({ good: 0, bad: 2 });
  const status = (e: Evidence) => evaluateEvidence(e, ctx).status;

  test("file", () => {
    expect(status({ kind: "file", path: "doc.md" })).toBe("pass");
    expect(status({ kind: "file", path: "nope.md" })).toBe("fail");
  });

  test("absent", () => {
    expect(status({ kind: "absent", pattern: "placeholder", paths: ["src"] })).toBe("fail");
    expect(
      status({
        kind: "absent",
        pattern: "PLACEHOLDER",
        paths: ["src"],
        exclude: "a\\.(test\\.)?ts$",
      }),
    ).toBe("pass");
    expect(status({ kind: "absent", pattern: "zzz", paths: ["src", "missing-dir"] })).toBe("pass");
  });

  test("present", () => {
    expect(status({ kind: "present", pattern: "PLACEHOLDER", paths: ["src"] })).toBe("pass");
    expect(status({ kind: "present", pattern: "zzz", paths: ["src"] })).toBe("fail");
    expect(status({ kind: "present", pattern: "hello", paths: ["doc.md"] })).toBe("pass");
  });

  test("command", () => {
    expect(status({ kind: "command", script: "good" })).toBe("pass");
    expect(status({ kind: "command", script: "bad" })).toBe("fail");
  });

  test("owner stays unattested until by, date and note are all set", () => {
    expect(status({ kind: "owner", label: "x", attestation: {} })).toBe("unattested");
    expect(
      status({ kind: "owner", label: "x", attestation: { by: "a", date: "2026-01-01" } }),
    ).toBe("unattested");
    expect(
      status({
        kind: "owner",
        label: "x",
        attestation: { by: "a", date: "2026-01-01", note: " " },
      }),
    ).toBe("unattested");
    expect(
      status({
        kind: "owner",
        label: "x",
        attestation: { by: "a", date: "2026-01-01", note: "done" },
      }),
    ).toBe("pass");
  });
});

describe("item status and exit codes", () => {
  const ctx = fixtureContext();
  const file = (path: string): Evidence => ({ kind: "file", path });
  const owner: Evidence = { kind: "owner", label: "x", attestation: {} };

  test("fail beats unattested beats pass", () => {
    const item = (evidence: Evidence[]) => ({ id: "i", text: "t", epic: "E", evidence });
    expect(evaluateItem(item([file("doc.md")]), ctx).status).toBe("pass");
    expect(evaluateItem(item([file("doc.md"), owner]), ctx).status).toBe("unattested");
    expect(evaluateItem(item([file("nope"), owner]), ctx).status).toBe("fail");
    expect(evaluateItem(item([]), ctx).status).toBe("unattested");
  });

  test("report mode exits 0, strict exits 1 on any non-pass", () => {
    const failing = evaluateAll(
      { items: [{ id: "i", text: "t", epic: "E", evidence: [file("nope")] }] },
      ctx,
    );
    const passing = evaluateAll(
      { items: [{ id: "i", text: "t", epic: "E", evidence: [file("doc.md")] }] },
      ctx,
    );
    expect(exitCodeFor(failing, false)).toBe(0);
    expect(exitCodeFor(failing, true)).toBe(1);
    expect(exitCodeFor(passing, true)).toBe(0);
  });

  test("strict via flag or FLUMP_LAUNCH", () => {
    expect(isStrict(["--strict"], {})).toBe(true);
    expect(isStrict([], { FLUMP_LAUNCH: "true" })).toBe(true);
    expect(isStrict([], { FLUMP_LAUNCH: "false" })).toBe(false);
    expect(isStrict([], {})).toBe(false);
  });

  test("markdown table", () => {
    const md = renderMarkdown(
      evaluateAll(
        { items: [{ id: "i", text: "a | b", epic: "E", evidence: [file("nope")] }] },
        ctx,
      ),
    );
    expect(md).toContain("| Status | Id | Epic | Item | Open evidence |");
    expect(md).toContain("| FAIL | i | E | a \\| b | missing nope |");
    expect(md).toContain("0 pass, 1 fail, 0 unattested of 1");
  });
});

describe("parseChecklist", () => {
  test("reads unchecked lines under the heading only", () => {
    const text =
      "- [ ] before\n### Launch-readiness checklist (x)\n\n- [ ] one\n- [x] done\n- [ ] two\n\n# Next\n- [ ] after\n";
    expect(parseChecklist(text)).toEqual(["one", "two"]);
  });
});

describe("docs/launch/readiness.json", () => {
  const readiness = loadReadiness(repoRoot);

  test("EPICS.md drift: every checklist line has an item with identical text", () => {
    const lines = parseChecklist(readFileSync(resolve(repoRoot, "docs/audit/EPICS.md"), "utf8"));
    expect(lines.length).toBeGreaterThan(0);
    const texts = new Set(readiness.items.map((i) => i.text));
    expect(lines.filter((l) => !texts.has(l))).toEqual([]);
  });

  test("ids are unique and every item has evidence", () => {
    const ids = readiness.items.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const item of readiness.items) expect(item.evidence.length).toBeGreaterThan(0);
  });

  test("owner attestations are never pre-filled", () => {
    for (const item of readiness.items)
      for (const e of item.evidence) if (e.kind === "owner") expect(e.attestation).toEqual({});
  });

  test("command evidence names real root scripts", () => {
    const { scripts } = JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8"));
    for (const item of readiness.items)
      for (const e of item.evidence)
        if (e.kind === "command") expect(scripts[e.script]).toBeDefined();
  });

  test("invalid regexes would throw: all patterns compile", () => {
    for (const item of readiness.items)
      for (const e of item.evidence)
        if (e.kind === "absent" || e.kind === "present") {
          expect(() => new RegExp(e.pattern, "im")).not.toThrow();
          if (e.exclude) expect(() => new RegExp(e.exclude)).not.toThrow();
        }
  });
});

describe("CLI", () => {
  const run = (...args: string[]) =>
    spawnSync("bun", ["scripts/check-launch-readiness.ts", ...args], {
      cwd: repoRoot,
      encoding: "utf8",
      env: { ...process.env, FLUMP_LAUNCH: "" },
    });

  test("report mode exits 0 and strict exits 1 while owner items are unattested", () => {
    expect(run().status).toBe(0);
    expect(run("--strict").status).toBe(1);
  }, 60_000);
});
