import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

// Scans only this package's source directory (never dist/ or coverage/).
const SRC_DIR = __dirname;

// Names that only ever appeared in the removed auto-seed data. Budget seed
// literals are covered separately when the budget seeding is removed.
const SEED_SIGNATURE = /Poplar|Curo|Main Checking|Workplace Pension — Nest|High Yield Savings/;

const collectSourceFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      return relative(SRC_DIR, full).split(sep)[0] === "migrations" ? [] : collectSourceFiles(full);
    }
    return entry.name.endsWith(".ts") && !entry.name.endsWith(".spec.ts") ? [full] : [];
  });

describe("no seed data in product source", () => {
  it("scans a non-trivial set of source files", () => {
    const files = collectSourceFiles(SRC_DIR).map((f) => relative(SRC_DIR, f));
    expect(files.length).toBeGreaterThan(10);
    expect(files).toContain("tax.controller.ts");
    expect(files.some((f) => f.startsWith("migrations"))).toBe(false);
    expect(files.some((f) => f.endsWith(".spec.ts"))).toBe(false);
  });

  it("no product source contains seed signatures", () => {
    const offenders = collectSourceFiles(SRC_DIR)
      .filter((file) => SEED_SIGNATURE.test(readFileSync(file, "utf8")))
      .map((file) => relative(SRC_DIR, file));
    expect(offenders).toEqual([]);
  });
});
