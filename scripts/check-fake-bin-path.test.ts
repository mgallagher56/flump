import { describe, expect, test } from "bun:test";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { findOnPath, isolatedPath } from "./lib/fake-bin";
import { findFakeThenRealPaths, isTestFile } from "./lib/fake-bin-path";

// Built at runtime so this file's own fixtures are not hits for the check it tests.
const path = (rest: string) => `PATH${rest}`;

describe("findFakeThenRealPaths on the real past lines", () => {
  test("clean-test-dbs.test.ts before e59a4b811: the fake bin then /usr/bin", () => {
    expect(findFakeThenRealPaths(path(': `${join(dir, "bin")}:/usr/bin:/bin`,'))).toEqual([1]);
  });

  test("restore-drill.test.ts and backup-dump.test.ts before this change: the fake then the real PATH", () => {
    const src = [
      "const result = run([], {",
      `        ${path(': `${dir}:${process.env.PATH ?? ""}`,')}`,
      "      });",
      `      { ${path(': `${bin}:${process.env.PATH ?? ""}` },')}`,
    ].join("\n");
    expect(findFakeThenRealPaths(src)).toEqual([2, 4]);
  });

  test("an isolated PATH, fake dirs only, or the plain real PATH pass", () => {
    const ok = [
      'PATH: `${join(dir, "bin")}:${join(dir, "tools")}`,',
      "PATH: isolatedPath(dir, { fakes }),",
      'PATH: process.env.PATH ?? "",',
    ].join("\n");
    expect(findFakeThenRealPaths(ok)).toEqual([]);
  });

  test("only test files are scanned", () => {
    expect(isTestFile("scripts/ops/clean-test-dbs.test.ts")).toBe(true);
    expect(isTestFile("apps/backend/src/x.spec.ts")).toBe(true);
    expect(isTestFile("scripts/ops/clean-test-dbs.sh")).toBe(false);
  });
});

describe("isolatedPath", () => {
  test("holds the fakes and the shell tools, never a real tool that was not named", () => {
    const dir = mkdtempSync(join(tmpdir(), "isolated-"));
    try {
      const bin = isolatedPath(dir, { fakes: { docker: "#!/bin/sh\nexit 0\n" } });
      const names = readdirSync(bin);
      expect(names).toContain("docker");
      expect(names).toContain("bash");
      expect(names).not.toContain("git");
      expect(() => readlinkSync(join(bin, "docker"))).toThrow(); // the fake is a file, not a link
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("a named real tool that is not installed throws", () => {
    const dir = mkdtempSync(join(tmpdir(), "isolated-"));
    try {
      expect(() => isolatedPath(dir, { tools: ["definitely-not-a-real-tool"] })).toThrow(
        'the real tool "definitely-not-a-real-tool" is not installed',
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("one isolatedPath for Bun and Node", () => {
  test("fake-bin.ts uses no Bun API, so the mobile Jest tests on Node can import it", () => {
    const source = readFileSync(join(import.meta.dir, "lib/fake-bin.ts"), "utf8");
    expect(source).not.toMatch(/\bBun\.|from "bun/);
  });

  test("findOnPath takes the first executable file, skipping plain files, folders and relative dirs", () => {
    const dir = mkdtempSync(join(tmpdir(), "find-on-path-"));
    try {
      const [plain, folder, exec, later] = ["plain", "folder", "exec", "later"].map((d) =>
        join(dir, d),
      );
      for (const d of [plain, folder, exec, later]) mkdirSync(d);
      writeFileSync(join(plain, "tool"), "not executable");
      mkdirSync(join(folder, "tool"));
      for (const d of [exec, later]) {
        writeFileSync(join(d, "tool"), "#!/bin/sh\n");
        chmodSync(join(d, "tool"), 0o755);
      }
      const path = ["relative/bin", plain, folder, exec, later].join(":");
      expect(findOnPath("tool", path)).toBe(join(exec, "tool"));
      expect(findOnPath("missing", path)).toBeNull();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
