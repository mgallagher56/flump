import { describe, expect, it } from "vitest";
import {
  balanceWeightedRate,
  estimateSavingsInterestNext12Months,
  interestOverNext12MonthsAtAer,
  monthlyRateFromAer,
  totalMonthlySavingAtShare,
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

  it("counts a joint account's monthly saving at the user's share, the same as its balance", () => {
    // 50% joint account: whole balance £10,000, so £5,000 at the share (passed in already at
    // share). 5% AER, whole monthly saving £200, so £100 a month at the share.
    //   Balance part: 5,000 × 0.05 = £250.
    //   Saving part: r = 1.05^(1/12) − 1 ≈ 0.0040741; end value of £100 a month for 12 months
    //   = 100 × ((1.05 − 1) / r) = 100 × 12.2725 ≈ £1,227.26, less 1,200 paid in ≈ £27.26.
    //   Total ≈ 250 + 27.26 = £277.26.
    const estimate = estimateSavingsInterestNext12Months([
      {
        type: "Saving",
        name: "Joint saver",
        accountSubtype: "easy_access",
        balance: 5000,
        interestRate: 5,
        monthlyContribution: 200,
        ownership: "joint",
        sharePercent: 50,
      },
    ]);
    expect(estimate?.total).toBeCloseTo(277.26, 1);
    expect(estimate?.outsideIsa).toBeCloseTo(277.26, 1);
  });
});

describe("totalMonthlySavingAtShare", () => {
  it("adds sole savings in full and joint savings at the user's share", () => {
    // Sole: £150 a month counts in full = £150.
    // Joint at 50%: whole £200 a month, the user's part = 200 × 0.5 = £100.
    // Joint at 25%: whole £80 a month, the user's part = 80 × 0.25 = £20.
    // Total = 150 + 100 + 20 = £270.
    expect(
      totalMonthlySavingAtShare([
        { type: "Saving", balance: 0, monthlyContribution: 150 },
        {
          type: "Saving",
          balance: 0,
          monthlyContribution: 200,
          ownership: "joint",
          sharePercent: 50,
        },
        {
          type: "Saving",
          balance: 0,
          monthlyContribution: "80",
          ownership: "joint",
          sharePercent: 25,
        },
      ]),
    ).toBe(270);
  });

  it("is null when no account stores a monthly saving, and counts a stored 0", () => {
    expect(totalMonthlySavingAtShare([{ type: "Saving", balance: 100 }])).toBeNull();
    expect(totalMonthlySavingAtShare([])).toBeNull();
    // A stored £0 is a known figure: total = 0.
    expect(
      totalMonthlySavingAtShare([{ type: "Saving", balance: 0, monthlyContribution: 0 }]),
    ).toBe(0);
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

describe("monthlyRateFromAer", () => {
  it("is the monthly rate that compounds to the AER", () => {
    // 12% AER: 1.12^(1/12) - 1. ln(1.12) = 0.113329; / 12 = 0.0094441; e^0.0094441 - 1 = 0.0094888.
    expect(monthlyRateFromAer(12)).toBeCloseTo(0.0094888, 6);
  });

  it("is 0 for a negative rate, and for one that is not a number", () => {
    expect(monthlyRateFromAer(-2)).toBe(0);
    expect(monthlyRateFromAer(Number.NaN)).toBe(0);
    expect(monthlyRateFromAer(Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe("interestOverNext12MonthsAtAer: balances and savings that cannot count", () => {
  it("counts a negative starting balance as 0", () => {
    // Same as a £0 balance with £100 a month at 12% AER: £64.65 (worked in the test above).
    expect(interestOverNext12MonthsAtAer(-1000, 12, 100)).toBeCloseTo(64.65, 1);
  });

  it("counts a starting balance that is not a finite number as 0", () => {
    expect(interestOverNext12MonthsAtAer(Number.POSITIVE_INFINITY, 12, 100)).toBeCloseTo(64.65, 1);
  });

  it("counts a negative monthly saving as 0", () => {
    // £1,000 at 12% AER and nothing paid in: 1,000 x 0.12 = £120.
    expect(interestOverNext12MonthsAtAer(1000, 12, -100)).toBeCloseTo(120, 6);
  });

  it("counts a monthly saving that is not a finite number as 0", () => {
    expect(interestOverNext12MonthsAtAer(1000, 12, Number.POSITIVE_INFINITY)).toBeCloseTo(120, 6);
  });
});

describe("blank stored values", () => {
  it("reads a blank monthly saving as not set, not as £0", () => {
    expect(
      totalMonthlySavingAtShare([{ type: "Saving", balance: 100, monthlyContribution: "" }]),
    ).toBeNull();
  });

  it("reads a blank rate as no rate, never as 0%", () => {
    // Only the account with a rate is counted: £1,000 at 12% AER = £120.
    const out = estimateSavingsInterestNext12Months([
      { type: "Saving", balance: 1000, interestRate: 12 },
      { type: "Saving", balance: 5000, interestRate: "" },
    ]);
    expect(out?.accountsCounted).toBe(1);
    expect(out?.accountsWithoutRate).toBe(1);
    expect(out?.total).toBeCloseTo(120, 6);
  });
});
