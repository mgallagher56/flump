import { UK_EWNI_INCOME_TAX } from "@flump/finance-engine";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TAKE_HOME_RULES_TAX_YEAR } from "./ClearTakeHomeSalaries1795530100000";

describe("ClearTakeHomeSalaries threshold", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("is the 2026/27 personal allowance, £12,570, whenever the migration runs", () => {
    // The tax year is named in the migration, never "the current year": with the clock in a later
    // tax year the threshold is the same, so a re-run on a fresh database decides the same rows.
    // The migration reads UK_EWNI_INCOME_TAX[TAKE_HOME_RULES_TAX_YEAR].personalAllowance at run
    // time (its helper is module-private: TypeORM constructs every exported function).
    expect(TAKE_HOME_RULES_TAX_YEAR).toBe("2026/27");
    for (const now of ["2026-11-19T12:00:00Z", "2031-06-01T12:00:00Z"]) {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(now));
      expect(UK_EWNI_INCOME_TAX[TAKE_HOME_RULES_TAX_YEAR]?.personalAllowance).toBe(12_570);
      vi.useRealTimers();
    }
  });
});
