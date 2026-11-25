import { describe, expect, it } from "vitest";
import { findHouseholdSwitchOn, isScannedForHouseholdSwitch } from "./household-gate-scan";

describe("findHouseholdSwitchOn", () => {
  it("finds the switch turned on in env, YAML, JSON and code forms", () => {
    const source = [
      "HOUSEHOLD_ENABLED=true",
      "  HOUSEHOLD_ENABLED: 'TRUE'",
      '"HOUSEHOLD_ENABLED": "true",',
      "process.env.HOUSEHOLD_ENABLED = `true`;",
      "HOUSEHOLD_ENABLED = true",
    ].join("\n");
    expect(findHouseholdSwitchOn(source)).toEqual([1, 2, 3, 4, 5]);
  });

  it("ignores the switch off, unset or merely named", () => {
    const source = [
      "HOUSEHOLD_ENABLED=false",
      "# HOUSEHOLD_ENABLED=",
      "HOUSEHOLD_ENABLED: text(),",
      "isHouseholdEnabled(env)",
      "HOUSEHOLD_ENABLED=trueish",
      "# HOUSEHOLD_ENABLED=true",
      " * `HOUSEHOLD_ENABLED=true` is refused",
    ].join("\n");
    expect(findHouseholdSwitchOn(source)).toEqual([]);
  });
});

describe("isScannedForHouseholdSwitch", () => {
  it("scans configuration and app code", () => {
    for (const file of [
      ".env.example",
      "apps/backend/.env.example",
      "apps/backend/Dockerfile",
      ".github/workflows/ci.yml",
      "railway.json",
      "apps/backend/src/main.ts",
      "scripts/dev.sh",
    ]) {
      expect(isScannedForHouseholdSwitch(file), file).toBe(true);
    }
  });

  it("skips tests, Markdown and the check itself", () => {
    for (const file of [
      "apps/backend/src/modules/household/household.controller.spec.ts",
      "apps/web/app/routes/app.household.test.tsx",
      "docs/legal/ropa.md",
      "scripts/check-household-gate.ts",
      "scripts/lib/household-gate-scan.ts",
    ]) {
      expect(isScannedForHouseholdSwitch(file), file).toBe(false);
    }
  });
});
