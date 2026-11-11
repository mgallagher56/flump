import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SEEDED_ACCOUNTS,
  SEEDED_BUDGET_ENTRIES,
  SEEDED_TAX_FINGERPRINTS,
} from "./RemoveSeededExampleData1794355400000";

describe("RemoveSeededExampleData fingerprints", () => {
  it("lists 62 unique md5 hashes", () => {
    expect(SEEDED_TAX_FINGERPRINTS).toHaveLength(62);
    for (const fp of SEEDED_TAX_FINGERPRINTS) expect(fp).toMatch(/^[0-9a-f]{32}$/);
    expect(new Set(SEEDED_TAX_FINGERPRINTS).size).toBe(62);
  });

  it("lists 4 seed accounts and 15 budget template rows", () => {
    expect(SEEDED_ACCOUNTS).toHaveLength(4);
    expect(SEEDED_BUDGET_ENTRIES).toHaveLength(15);
  });

  it("does not reintroduce the personal ledger into the migration or this spec", () => {
    // Words are assembled so that this spec does not contain them either.
    const banned = [
      ["Pop", "lar"],
      ["Cu", "ro"],
    ].map((parts) => parts.join(""));
    for (const file of ["RemoveSeededExampleData1794355400000.ts", "seed-fingerprints.spec.ts"]) {
      const text = readFileSync(join(__dirname, file), "utf8");
      for (const word of banned) expect(text, file).not.toContain(word);
    }
  });
});
