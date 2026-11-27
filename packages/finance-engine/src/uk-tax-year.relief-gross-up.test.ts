// @vitest-environment node
import { describe, expect, it } from "vitest";
import { getUkTaxYearRules, reliefAtSourceGrossUp } from "./uk-tax-year.js";

describe("reliefAtSourceGrossUp", () => {
  it("is 1.25 at a 20% basic rate", () => {
    // 1 / (1 - 0.20) = 1 / 0.8 = 1.25: £1,200 paid is £1,500 in the pension.
    expect(reliefAtSourceGrossUp(getUkTaxYearRules("2026/27"))).toBe(1.25);
  });

  it("follows the basic rate it is given", () => {
    // 1 / (1 - 0.25) = 1 / 0.75 = 1.3333...
    expect(
      reliefAtSourceGrossUp({ ewni: { ...getUkTaxYearRules("2026/27").ewni, basicRate: 0.25 } }),
    ).toBeCloseTo(4 / 3, 10);
  });
});
