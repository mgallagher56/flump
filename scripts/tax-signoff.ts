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
import { applySignoff, generateSheet, parseTicked } from "./lib/tax-signoff";

const repoRoot = resolve(import.meta.dir, "..");
const vectorsFile = resolve(repoRoot, "packages/finance-engine/src/test-vectors/uk-tax.vectors.ts");

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
  writeFileSync(out, generateSheet(String(year), UK_TAX_VECTORS));
  console.log(`Wrote ${out}`);
} else if (cmd === "apply") {
  if (process.env.CI) die("Refusing to sign off in CI. Sign-off is the owner's task.");
  if (!rest.includes("--i-am-the-owner")) die("Pass --i-am-the-owner to confirm you are signing.");
  const sheet = flag("sheet") ?? die("--sheet <file> is required");
  const result = applySignoff(
    readFileSync(vectorsFile, "utf8"),
    String(year),
    parseTicked(readFileSync(String(sheet), "utf8")),
    UK_TAX_VECTORS,
    new Date().toISOString().slice(0, 10),
  );
  writeFileSync(vectorsFile, result.text);
  console.log(`Signed ${result.signed.length}. Skipped ${result.skipped.length}.`);
  for (const s of result.skipped) console.log(`  skipped ${s.id}: ${s.reason}`);
} else {
  die("usage: tax-signoff.ts sheet|apply --year YYYY/YY [...]");
}
