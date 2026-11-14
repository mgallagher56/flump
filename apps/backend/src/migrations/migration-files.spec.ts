import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("migration file names", () => {
  it("end in their 13-digit timestamp, otherwise the migrations glob ignores them", () => {
    const files = readdirSync(__dirname).filter((f) => !f.endsWith(".spec.ts"));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      expect(file).toMatch(/\d{13}\.ts$/);
    }
  });

  it("take the migration lock through config/migration-lock.ts after AddUserIdIndexes", () => {
    // Older migrations are already applied everywhere; newer ones must lift the pool's timeouts
    // before waiting on the lock, which the helpers do (see takeMigrationLock).
    const newer = readdirSync(__dirname).filter((f) => {
      const stamp = f.match(/(\d{13})\.ts$/)?.[1];
      return !f.endsWith(".spec.ts") && stamp !== undefined && stamp > "1794358100000";
    });
    for (const file of newer) {
      const source = readFileSync(join(__dirname, file), "utf8");
      expect(source, file).not.toMatch(/pg_advisory_(xact_)?lock\(/);
    }
  });
});
