/**
 * E41 M2: the unused ISA allowance observation in the wealth stage of the health score.
 * The observation appears only while less than half of the 20,000 ISA allowance is used.
 */
import { describe, expect, it } from "vitest";
import { calculateFinancialHealthScore } from "./health-score.js";

const isaObservation = (annualIsaContributionGbp: number) =>
  calculateFinancialHealthScore({
    stage: "STAGE_3_WEALTH_OPTIMIZE",
    annualIsaContributionGbp,
  }).observations.find((o) => o.includes("ISA allowance is unused"));

describe("health score: unused ISA allowance observation", () => {
  it("names the unused allowance when just under half is used", () => {
    // 9,999 of 20,000 used is under half: 20,000 - 9,999 = 10,001 unused.
    expect(isaObservation(9999)).toBe(
      "£10,001 of this tax year's ISA allowance is unused (resets 6 April).",
    );
  });

  it("says nothing once exactly half the allowance is used", () => {
    // 10,000 / 20,000 = 0.5, which is not under half.
    expect(isaObservation(10000)).toBeUndefined();
  });
});
