/**
 * The household switch stays off by default (E34 C3, apps/backend/src/config/household-gate.ts).
 * Fails when:
 * - `isHouseholdEnabled` reads an unset, empty or non-`true` variable as on;
 * - `HOUSEHOLD_LAUNCH_CONDITIONS_MET` is true (only the owner flips it, in a PR that also changes
 *   this check, once the charity review, the signed DPIA and the approved help line wording exist);
 * - any checked-in file other than a test turns `HOUSEHOLD_ENABLED` on (an env example, a Docker,
 *   CI or Railway file, a script or app code).
 *   bun scripts/check-household-gate.ts
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  HOUSEHOLD_LAUNCH_CONDITIONS_MET,
  isHouseholdEnabled,
} from "../apps/backend/src/config/household-gate";
import { findHouseholdSwitchOn, isScannedForHouseholdSwitch } from "./lib/household-gate-scan";
import { repoRoot } from "./lib/scan";

const failures: string[] = [];

for (const value of [undefined, "", " ", "false", "1", "yes", "on"]) {
  if (isHouseholdEnabled({ HOUSEHOLD_ENABLED: value })) {
    failures.push(`isHouseholdEnabled reads HOUSEHOLD_ENABLED=${JSON.stringify(value)} as on`);
  }
}
if (isHouseholdEnabled({})) failures.push("isHouseholdEnabled is on with nothing set");
if (HOUSEHOLD_LAUNCH_CONDITIONS_MET) {
  failures.push(
    "HOUSEHOLD_LAUNCH_CONDITIONS_MET is true; only the owner sets it, and this check changes with it",
  );
}

const files = execFileSync(
  "git",
  ["ls-files", "-z", "--cached", "--others", "--exclude-standard"],
  { cwd: repoRoot, encoding: "utf8" },
)
  .split("\0")
  .filter((f) => isScannedForHouseholdSwitch(f) && existsSync(join(repoRoot, f)));

for (const file of files) {
  for (const line of findHouseholdSwitchOn(readFileSync(join(repoRoot, file), "utf8"))) {
    failures.push(`${file}:${line} turns HOUSEHOLD_ENABLED on`);
  }
}

if (failures.length) {
  console.error(
    `The household switch must stay off by default:\n${failures.join("\n")}\nOnly the owner turns households on, once the CD7 charity review, the signed household DPIA and the CD10 help line wording all exist (apps/backend/src/config/household-gate.ts).`,
  );
  process.exit(1);
}
console.log("check-household-gate: OK");
