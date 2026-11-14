/**
 * Backend laws runner (BE-01). Runs every `scripts/backend-laws/check-*.ts` in turn, so a later PR
 * adds a law by adding a file there, without touching package.json or the CI workflow. Each law is a
 * standalone script: exit 0 passes, anything else fails. All laws run even when one fails.
 */
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { resolve } from "node:path";

export const lawsDir = resolve(import.meta.dir, "backend-laws");

/** Law scripts in a stable order: `check-*.ts`, never tests. */
export function listLaws(files: string[]): string[] {
  return files.filter((f) => /^check-.+\.ts$/.test(f) && !/\.test\.ts$/.test(f)).sort();
}

if (import.meta.main) {
  const laws = listLaws(readdirSync(lawsDir));
  const failed: string[] = [];
  for (const law of laws) {
    const run = spawnSync("bun", [resolve(lawsDir, law)], { stdio: "inherit" });
    if (run.status !== 0) failed.push(`${law} (exit ${run.status ?? run.signal})`);
  }
  if (failed.length) {
    console.error(`check-backend-laws: ${failed.length} of ${laws.length} law(s) failed:`);
    for (const f of failed) console.error(`  - ${f}`);
    process.exit(1);
  }
  console.log(`check-backend-laws: OK (${laws.length} law(s))`);
}
