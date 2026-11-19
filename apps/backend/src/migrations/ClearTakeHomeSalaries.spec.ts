import { UK_EWNI_INCOME_TAX } from "@flump/finance-engine";
import { describe, expect, it } from "vitest";
import { TAKE_HOME_PAIR_AMBIGUOUS_UP_TO } from "./ClearTakeHomeSalaries1795530100000";

describe("ClearTakeHomeSalaries threshold", () => {
  it("is the frozen 2026/27 personal allowance, £12,570, the engine's figure for that year", () => {
    // Frozen in the migration so it decides the same rows whenever it runs, and so it loads where
    // the engine is not built. It must still be the 2026/27 allowance the engine holds.
    expect(TAKE_HOME_PAIR_AMBIGUOUS_UP_TO).toBe(12_570);
    expect(TAKE_HOME_PAIR_AMBIGUOUS_UP_TO).toBe(UK_EWNI_INCOME_TAX["2026/27"]?.personalAllowance);
  });
});
