import { describe, expect, it } from "vitest";
import { UpsertRetirementPlanRequest } from "./domains/retirement.js";

describe("UpsertRetirementPlanRequest ages", () => {
  const ok = (body: Record<string, unknown>) => UpsertRetirementPlanRequest.safeParse(body).success;

  it("needs the plan-to age to be after the retirement age", () => {
    // The rule: planToAge must be greater than retirementAge, so 68 after 67 passes, and the same
    // age or an earlier one is refused.
    expect(ok({ retirementAge: 67, planToAge: 68 })).toBe(true);
    expect(ok({ retirementAge: 67, planToAge: 67 })).toBe(false);
    expect(ok({ retirementAge: 67, planToAge: 60 })).toBe(false);
  });

  it("names planToAge as the field at fault", () => {
    const result = UpsertRetirementPlanRequest.safeParse({ retirementAge: 67, planToAge: 60 });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path)).toEqual([["planToAge"]]);
  });

  it("checks the order only when both ages are given", () => {
    // Either age left out or cleared to null leaves nothing to compare.
    expect(ok({ retirementAge: 67 })).toBe(true);
    expect(ok({ planToAge: 60 })).toBe(true);
    expect(ok({ retirementAge: null, planToAge: 60 })).toBe(true);
    expect(ok({ retirementAge: 67, planToAge: null })).toBe(true);
  });
});
