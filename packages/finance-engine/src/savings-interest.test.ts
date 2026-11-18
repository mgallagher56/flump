import { describe, expect, it } from "vitest";
import { balanceWeightedRate, estimateSavingsInterestNext12Months } from "./savings-interest.js";

describe("estimateSavingsInterestNext12Months", () => {
  it("splits interest into ISA and outside an ISA, before tax", () => {
    // Cash ISA: £1,000 at 12% AER compounding monthly at 1% a month, no monthly saving.
    //   1.01^2 = 1.0201, ^4 = 1.04060401, ^8 = 1.08285671, ^12 = 1.08285671 × 1.04060401
    //   = 1.12682503, so interest = 1,000 × 0.12682503 = £126.83.
    // Easy access: £2,000 at 6% AER, 0.5% a month.
    //   1.005^2 = 1.010025, ^4 = 1.02015050, ^8 = 1.04070704, ^12 = 1.04070704 × 1.02015050
    //   = 1.06167781, so interest = 2,000 × 0.06167781 = £123.36.
    // Total = 126.83 + 123.36 = £250.18 (to the penny: 126.825 + 123.356 = 250.181).
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
    expect(estimate?.isa).toBeCloseTo(126.83, 2);
    expect(estimate?.outsideIsa).toBeCloseTo(123.36, 2);
    expect(estimate?.total).toBeCloseTo(250.18, 2);
    expect(estimate?.accountsCounted).toBe(2);
  });

  it("counts the regular monthly saving as it is paid in", () => {
    // £0 balance, £100 a month at 12% AER (1% a month), paid in at the end of each month.
    //   Balance after 12 months = 100 × (1.01^12 − 1) / 0.01 = 100 × 12.682503 = £1,268.25.
    //   Paid in = 12 × 100 = £1,200, so interest = 1,268.25 − 1,200 = £68.25.
    const estimate = estimateSavingsInterestNext12Months([
      { type: "Saving", name: "Regular", balance: 0, interestRate: 12, monthlyContribution: 100 },
    ]);
    expect(estimate?.outsideIsa).toBeCloseTo(68.25, 2);
    expect(estimate?.isa).toBe(0);
  });

  it("leaves out investments and accounts with no rate, and never counts a missing rate as 0%", () => {
    // Only the £1,000 Saving at 12% counts: £126.83 as worked above. The Investment is a return,
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
    expect(estimate?.total).toBeCloseTo(126.83, 2);
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
