/**
 * Owner sign-off tooling for tax vectors (E22). See docs/runbooks/tax-year-update.md.
 *
 *   bun run tax:signoff sheet --year 2026/27 [--out docs/tax-vector-signoff-2026-27.md]
 *   bun run tax:signoff apply --year 2026/27 --sheet <ticked sheet>
 *
 * `apply` is the owner's command: it refuses to run in CI and needs --i-am-the-owner.
 * Agents must never run it (DECISIONS round 3 item 13).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { UK_TAX_VECTORS } from "../packages/finance-engine/src/test-vectors/uk-tax.vectors";
import { UK_WHATIF_VECTORS } from "../packages/finance-engine/src/test-vectors/uk-whatif.vectors";
import { applySignoff, generateSheet, parseTicked } from "./lib/tax-signoff";

const repoRoot = resolve(import.meta.dir, "..");
const vectorsDir = resolve(repoRoot, "packages/finance-engine/src/test-vectors");
// The core catalogue and the E25-T2 what-if catalogue are separate files; sign-off covers both.
const catalogues = [
  { file: resolve(vectorsDir, "uk-tax.vectors.ts"), vectors: UK_TAX_VECTORS },
  { file: resolve(vectorsDir, "uk-whatif.vectors.ts"), vectors: UK_WHATIF_VECTORS },
] as const;
const allVectors = [...UK_TAX_VECTORS, ...UK_WHATIF_VECTORS];

const [cmd, ...rest] = process.argv.slice(2);
const flag = (name: string) => {
  const i = rest.indexOf(`--${name}`);
  return i === -1 ? undefined : rest[i + 1];
};
const year = flag("year");
const die = (msg: string): never => {
  console.error(msg);
  process.exit(2);
};

if (!year || !/^\d{4}\/\d{2}$/.test(year)) die("--year YYYY/YY is required");

if (cmd === "sheet") {
  const out =
    flag("out") ??
    resolve(repoRoot, `docs/tax-vector-signoff-${String(year).replace("/", "-")}.md`);
  writeFileSync(out, generateSheet(String(year), allVectors));
  console.log(`Wrote ${out}`);
} else if (cmd === "apply") {
  if (process.env.CI) die("Refusing to sign off in CI. Sign-off is the owner's task.");
  if (!rest.includes("--i-am-the-owner")) die("Pass --i-am-the-owner to confirm you are signing.");
  const sheet = flag("sheet") ?? die("--sheet <file> is required");
  const ticked = parseTicked(readFileSync(String(sheet), "utf8"));
  let signed = 0;
  let skipped = 0;
  for (const { file, vectors } of catalogues) {
    const ids = new Set(vectors.map((v) => v.id));
    const result = applySignoff(
      readFileSync(file, "utf8"),
      String(year),
      ticked.filter((t) => ids.has(t.id)),
      vectors,
      new Date().toISOString().slice(0, 10),
    );
    writeFileSync(file, result.text);
    signed += result.signed.length;
    skipped += result.skipped.length;
    for (const s of result.skipped) console.log(`  skipped ${s.id}: ${s.reason}`);
  }
  for (const t of ticked) {
    if (!allVectors.some((v) => v.id === t.id)) console.log(`  skipped ${t.id}: unknown vector id`);
  }
  console.log(`Signed ${signed}. Skipped ${skipped}.`);
} else {
  die("usage: tax-signoff.ts sheet|apply --year YYYY/YY [...]");
}
