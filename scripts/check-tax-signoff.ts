/**
 * BE-08 law: unsigned tax vectors may go down, never up. Compares the IDs of every vector with
 * `signedOffBy: null` (core and what-if catalogues) against scripts/tax-signoff-baseline.json.
 *
 *   bun scripts/check-tax-signoff.ts                   # fail on new unsigned IDs or a stale baseline
 *   bun scripts/check-tax-signoff.ts --write-baseline  # after the owner signs vectors off
 *
 * Signing off is the owner's task (bun run tax:signoff apply); agents never sign vectors off.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { UK_TAX_VECTORS } from "../packages/finance-engine/src/test-vectors/uk-tax.vectors";
import { UK_WHATIF_VECTORS } from "../packages/finance-engine/src/test-vectors/uk-whatif.vectors";
import { compareUnsignedToBaseline, unsignedVectorIds } from "./lib/tax-signoff";

const baselinePath = resolve(import.meta.dir, "tax-signoff-baseline.json");
const unsigned = unsignedVectorIds([...UK_TAX_VECTORS, ...UK_WHATIF_VECTORS]);

if (process.argv.includes("--write-baseline")) {
  writeFileSync(baselinePath, `${JSON.stringify(unsigned, null, 2)}\n`);
  console.log(`Wrote ${unsigned.length} unsigned vector id(s) to ${baselinePath}`);
  process.exit(0);
}

const baseline: string[] = existsSync(baselinePath)
  ? JSON.parse(readFileSync(baselinePath, "utf8"))
  : [];
const { added, stale } = compareUnsignedToBaseline(unsigned, baseline);
for (const id of added)
  console.error(`FAIL ${id}: new tax vector without owner sign-off (bun run tax:signoff)`);
for (const id of stale)
  console.error(`STALE ${id} (run: bun scripts/check-tax-signoff.ts --write-baseline)`);
if (added.length || stale.length) process.exit(1);
console.log(`check-tax-signoff: OK (${unsigned.length} unsigned, baseline ${baseline.length})`);
