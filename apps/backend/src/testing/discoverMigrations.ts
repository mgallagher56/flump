import { readdirSync } from "node:fs";
import { join } from "node:path";

export const MIGRATIONS_DIR = join(__dirname, "..", "migrations");

export type MigrationClass = new (...args: never[]) => unknown;

/**
 * Test-only discovery of TypeORM migration classes. TypeORM's glob loader uses native import,
 * which cannot parse .ts under vitest, so tests pass classes directly. Finds every
 * `*<digits>.ts` file in the migrations directory, collects exported classes whose names end in
 * 13 digits (the timestamp), sorts by timestamp, and throws unless there is exactly one class per
 * file, so a new migration can never be silently skipped.
 */
export async function discoverMigrations(dir: string = MIGRATIONS_DIR): Promise<MigrationClass[]> {
  const files = readdirSync(dir).filter((f) => /\d+\.ts$/.test(f) && !f.endsWith(".d.ts"));
  const migrations: MigrationClass[] = [];
  for (const file of files) {
    const mod = (await import(join(dir, file))) as Record<string, unknown>;
    for (const exported of Object.values(mod)) {
      if (typeof exported === "function" && /\d{13}$/.test(exported.name)) {
        migrations.push(exported as MigrationClass);
      }
    }
  }
  migrations.sort((x, y) => Number(x.name.slice(-13)) - Number(y.name.slice(-13)));
  if (migrations.length !== files.length) {
    throw new Error(
      `Expected one migration class per file in ${dir}: ${files.length} files, ${migrations.length} classes`,
    );
  }
  return migrations;
}
