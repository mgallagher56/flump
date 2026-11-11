import { readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("migration file names", () => {
  it("end in their 13-digit timestamp, otherwise the migrations glob ignores them", () => {
    const files = readdirSync(__dirname).filter((f) => !f.endsWith(".spec.ts"));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      expect(file).toMatch(/\d{13}\.ts$/);
    }
  });
});
