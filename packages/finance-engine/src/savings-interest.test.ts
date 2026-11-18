import { describe, expect, it } from "vitest";
import {
  balanceWeightedRate,
  estimateSavingsInterestNext12Months,
  interestOverNext12MonthsAtAer,
} from "./savings-interest.js";

describe("interestOverNext12MonthsAtAer", () => {
  it("gives exactly the AER on a balance with no monthly saving", () => {
    // The AER already includes compounding, so a year's interest is balance × AER.
    // £1,000 at 12% AER: 1,000 × 0.12 = £120. £2,000 at 6% AER: 2,000 × 0.06 = £120.
    expect(interestOverNext12MonthsAtAer(1000, 12, 0)).toBeCloseTo(120, 6);
    expect(interestOverNext12MonthsAtAer(2000, 6, 0)).toBeCloseTo(120, 6);
  });

  it("adds the monthly saving at the end of each month", () => {
    // £0 balance, £100 a month at 12% AER.
    //   r = 1.12^(1/12) − 1 = 0.0094888 a month, and (1 + r)^12 = 1.12 exactly.
    //   End balance = 100 × ((1 + r)^12 − 1) / r = 100 × 0.12 / 0.0094888 = £1,264.65.
    //   Paid in = 12 × 100 = £1,200, so interest = 1,264.65 − 1,200 = £64.65.
    expect(interestOverNext12MonthsAtAer(0, 12, 100)).toBeCloseTo(64.65, 1);
  });

  it("is 0 for a rate of 0 or less, or a rate that is not a number", () => {
    expect(interestOverNext12MonthsAtAer(1000, 0, 100)).toBe(0);
    expect(interestOverNext12MonthsAtAer(1000, -2, 100)).toBe(0);
    expect(interestOverNext12MonthsAtAer(1000, Number.NaN, 100)).toBe(0);
    expect(interestOverNext12MonthsAtAer(1000, Number.POSITIVE_INFINITY, 100)).toBe(0);
  });
});

describe("estimateSavingsInterestNext12Months", () => {
  it("splits interest into ISA and outside an ISA, before tax", () => {
    // Cash ISA: £1,000 at 12% AER, no monthly saving: 1,000 × 0.12 = £120.
    // Easy access: £2,000 at 6% AER: 2,000 × 0.06 = £120.
    // Total = 120 + 120 = £240.
    const estimate = estimateSavingsInterestNext12Months([
      { type: "Saving", name: "ISA", accountSubtype: "cash_isa", balance: 1000, interestRate: 12 },
      {
        type: "Saving",
        name: "Easy",
        accountSubtype: "easy_access",
        balance: 2000,
        interestRate: 6,
      },
    ]);
    expect(estimate?.isa).toBeCloseTo(120, 2);
    expect(estimate?.outsideIsa).toBeCloseTo(120, 2);
    expect(estimate?.total).toBeCloseTo(240, 2);
    expect(estimate?.accountsCounted).toBe(2);
  });

  it("counts the regular monthly saving as it is paid in", () => {
    // £0 balance, £100 a month at 12% AER: £64.65, worked in the test above
    // (100 × 0.12 / 0.0094888 = 1,264.65, less 1,200 paid in).
    const estimate = estimateSavingsInterestNext12Months([
      { type: "Saving", name: "Regular", balance: 0, interestRate: 12, monthlyContribution: 100 },
    ]);
    expect(estimate?.outsideIsa).toBeCloseTo(64.65, 1);
    expect(estimate?.isa).toBe(0);
  });

  it("leaves out investments and accounts with no rate, and never counts a missing rate as 0%", () => {
    // Only the £1,000 Saving at 12% AER counts: 1,000 × 0.12 = £120. The Investment is a return,
    // not interest, and the Saving without a rate is counted as without a rate.
    const estimate = estimateSavingsInterestNext12Months([
      { type: "Saving", name: "Easy", balance: 1000, interestRate: 12 },
      { type: "Saving", name: "No rate", balance: 5000, interestRate: null },
      {
        type: "Investment",
        name: "S&S",
        accountSubtype: "stocks_and_shares_isa",
        balance: 9000,
        interestRate: 7,
      },
    ]);
    expect(estimate?.total).toBeCloseTo(120, 2);
    expect(estimate?.accountsCounted).toBe(1);
    expect(estimate?.accountsWithoutRate).toBe(1);
  });

  it("returns null when no cash savings account has a rate", () => {
    expect(
      estimateSavingsInterestNext12Months([{ type: "Saving", name: "x", balance: 100 }]),
    ).toBeNull();
    expect(estimateSavingsInterestNext12Months([])).toBeNull();
  });
});

describe("balanceWeightedRate", () => {
  it("weights each rate by its balance", () => {
    // (1,000 × 2 + 3,000 × 4) / (1,000 + 3,000) = (2,000 + 12,000) / 4,000 = 3.5
    expect(
      balanceWeightedRate([
        { balance: 1000, interestRate: 2 },
        { balance: 3000, interestRate: 4 },
        { balance: 9000, interestRate: null },
      ]),
    ).toBe(3.5);
  });

  it("uses a simple mean when the rated balances are all 0, and null with no rate", () => {
    // (2 + 4) / 2 = 3
    expect(
      balanceWeightedRate([
        { balance: 0, interestRate: 2 },
        { balance: 0, interestRate: 4 },
      ]),
    ).toBe(3);
    expect(balanceWeightedRate([{ balance: 10 }])).toBeNull();
  });
});
