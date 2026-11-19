import { describe, expect, it } from "vitest";
import { PortfolioSnapshot } from "../../portfolio.js";
import { selectDebtSummary } from "./debt-summary.js";

const snap = (accounts: Parameters<typeof PortfolioSnapshot.prototype.constructor>[0]) =>
  new PortfolioSnapshot(accounts, []);
const AS_OF = new Date("2026-11-15T12:00:00Z");

describe("selectDebtSummary", () => {
  it("is null with no consumer debt (a mortgage is not consumer debt)", () => {
    expect(
      selectDebtSummary(
        snap([{ id: "m", name: "Home", type: "Mortgage", balance: -200000, interestRate: 4 }]),
        AS_OF,
      ),
    ).toBeNull();
  });

  it("gives the minimum-only date and the interest on that schedule", () => {
    // Card £100 at 12% APR with a stored £150 minimum. Month 1 (December 2026): interest
    // 100 x 12% / 12 = £1.00, balance £101, the £150 minimum clears it. Total interest £1.00,
    // debt-free December 2026. A credit card counts as high interest whatever its APR.
    const s = selectDebtSummary(
      snap([
        {
          id: "c",
          name: "Card",
          type: "Credit Card",
          balance: -100,
          interestRate: 12,
          monthlyContribution: 150,
        },
      ]),
      AS_OF,
    );
    expect(s).toMatchObject({
      totalDebt: 100,
      debtCount: 1,
      highInterestCount: 1,
      monthlyMinimumTotal: 150,
      monthlyMinimumEstimated: false,
      debtFreeDate: "December 2026",
      totalInterest: 1,
    });
  });

  it("gives no date and no interest when any APR is unknown", () => {
    // Card £2,000 at 20% (£60 stored) and a loan of £5,000 with no APR (SD-6). Total £7,000.
    // The loan's minimum is estimated: max(25, 2.5% x 5,000) = £125. Minimums 60 + 125 = 185.
    const s = selectDebtSummary(
      snap([
        {
          id: "c",
          name: "Card",
          type: "Credit Card",
          balance: -2000,
          interestRate: 20,
          monthlyContribution: 60,
        },
        { id: "l", name: "Loan", type: "Loan", balance: -5000 },
      ]),
      AS_OF,
    );
    expect(s).toMatchObject({
      totalDebt: 7000,
      debtCount: 2,
      highInterestCount: 1,
      monthlyMinimumTotal: 185,
      monthlyMinimumEstimated: true,
      debtFreeDate: null,
      totalInterest: null,
    });
  });

  it("gives no date when the minimum never clears the debt", () => {
    // £10,000 at 30% APR costs 10,000 x 30% / 12 = £250 a month in interest; a £100 minimum
    // never clears it.
    const s = selectDebtSummary(
      snap([
        {
          id: "c",
          name: "Card",
          type: "Credit Card",
          balance: -10000,
          interestRate: 30,
          monthlyContribution: 100,
        },
      ]),
      AS_OF,
    );
    expect(s?.debtFreeDate).toBeNull();
    expect(s?.totalInterest).toBeNull();
  });
});
