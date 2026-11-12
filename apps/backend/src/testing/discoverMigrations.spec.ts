import { mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { discoverMigrations, MIGRATIONS_DIR } from "./discoverMigrations";

describe("discoverMigrations", () => {
  it("returns one class per migration file, sorted by timestamp", async () => {
    const migrations = await discoverMigrations();
    const files = readdirSync(MIGRATIONS_DIR).filter(
      (f) => /\d+\.ts$/.test(f) && !f.endsWith(".d.ts"),
    );
    expect(migrations).toHaveLength(files.length);
    expect(migrations.length).toBeGreaterThan(0);
    const stamps = migrations.map((m) => Number(m.name.slice(-13)));
    expect(stamps).toEqual([...stamps].sort((a, b) => a - b));
    for (const m of migrations) expect(m.name).toMatch(/\d{13}$/);
  });

  it("throws when a file does not export exactly one migration class", async () => {
    const dir = mkdtempSync(join(tmpdir(), "migrations-"));
    writeFileSync(join(dir, "NoClass1794355200000.ts"), "export const x = 1;\n");
    await expect(discoverMigrations(dir)).rejects.toThrow(/one migration class per file/);
  });
});
