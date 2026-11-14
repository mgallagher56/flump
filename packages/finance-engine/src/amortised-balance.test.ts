import { describe, expect, it } from "vitest";
import { amortiseOneMonth, projectAmortisedBalance } from "./mortgage.js";

describe("projectAmortisedBalance (check-in calculated balances)", () => {
  it("takes one month of interest and one payment off a repayment mortgage", () => {
    // £186,000 at 4.5%: £697.50 interest, so a £1,250 payment repays £552.50.
    expect(
      projectAmortisedBalance({
        balanceGbp: 186_000,
        interestRateApr: 4.5,
        monthlyPaymentGbp: 1250,
        months: 1,
      }),
    ).toBe(185_447.5);
  });

  it("compounds month by month, the same step the amortisation uses", () => {
    let balance = 8400;
    for (let m = 0; m < 3; m++) balance = amortiseOneMonth(balance, 0.079 / 12, 265).balanceGbp;
    expect(
      projectAmortisedBalance({
        balanceGbp: 8400,
        interestRateApr: 7.9,
        monthlyPaymentGbp: 265,
        months: 3,
      }),
    ).toBe(Math.round(balance * 100) / 100);
  });

  it("returns the starting balance for zero months and never goes below zero", () => {
    const base = { balanceGbp: 500, interestRateApr: 0, monthlyPaymentGbp: 300 };
    expect(projectAmortisedBalance({ ...base, months: 0 })).toBe(500);
    expect(projectAmortisedBalance({ ...base, months: 5 })).toBe(0);
  });
});
