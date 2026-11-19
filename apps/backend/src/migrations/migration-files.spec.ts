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

  it("have unique timestamps (finding N5), apart from one documented legacy pair", () => {
    // TypeORM orders migrations by timestamp, so two files sharing one run in an order that rests
    // on the class name. The pair below shipped before this check and is applied everywhere, so it
    // is not renamed (that would change the recorded migration names). No new file may join it.
    const LEGACY_SHARED: Record<string, readonly string[]> = {
      "1794700000000": [
        "AddLivingWithFamilyHousingStatus1794700000000.ts",
        "AuditEventsAndConsents1794700000000.ts",
      ],
    };
    const byStamp = new Map<string, string[]>();
    for (const file of readdirSync(__dirname).filter((f) => !f.endsWith(".spec.ts"))) {
      const stamp = file.match(/(\d{13})\.ts$/)?.[1];
      if (stamp === undefined) continue;
      byStamp.set(stamp, [...(byStamp.get(stamp) ?? []), file]);
    }
    for (const [stamp, files] of byStamp) {
      if (files.length === 1) continue;
      expect(files.sort(), `timestamp ${stamp} is shared`).toEqual(LEGACY_SHARED[stamp]);
    }
  });

  it("export no function other than the migration class, since TypeORM constructs every one", async () => {
    // TypeORM loads each file in the migrations glob and calls `new` on every exported function,
    // so an exported helper function stops the backend booting ("function is not a constructor").
    // Constants may be exported; helper functions stay module-private.
    const files = readdirSync(__dirname).filter((f) => /\d{13}\.ts$/.test(f));
    for (const file of files) {
      const exported: Record<string, unknown> = await import(join(__dirname, file));
      for (const [name, value] of Object.entries(exported)) {
        if (typeof value !== "function") continue;
        const proto = (value as { prototype?: { up?: unknown; down?: unknown } }).prototype;
        expect(typeof proto?.up, `${file} exports ${name}`).toBe("function");
        expect(typeof proto?.down, `${file} exports ${name}`).toBe("function");
      }
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
