import { PortfolioSnapshot } from "@flump/finance-engine";
import { describe, expect, it } from "vitest";
import { buildDebtSummary } from "./debtSummary";

const snap = (accounts: any[]) => new PortfolioSnapshot(accounts, []);

describe("buildDebtSummary", () => {
  it("returns null for a mortgage-only portfolio", () => {
    expect(
      buildDebtSummary(
        snap([{ id: "m", name: "Home", type: "Mortgage", balance: -200000, interestRate: 4 }]),
      ),
    ).toBeNull();
  });

  it("counts a card at 22.9% as high interest", () => {
    const s = buildDebtSummary(
      snap([
        {
          id: "c",
          name: "Card",
          type: "Credit Card",
          balance: -2000,
          interestRate: 22.9,
          monthlyContribution: 60,
        },
      ]),
    );
    expect(s?.highInterestCount).toBe(1);
    expect(s?.debtCount).toBe(1);
    expect(s?.monthlyMinimumTotal).toBe(60);
  });

  it("does not count a 3% loan as high interest", () => {
    const s = buildDebtSummary(
      snap([{ id: "l", name: "Loan", type: "Loan", balance: -5000, interestRate: 3 }]),
    );
    expect(s?.highInterestCount).toBe(0);
  });

  it("totalDebt equals the consumer debt total and excludes the mortgage", () => {
    const snapshot = snap([
      { id: "c", name: "Card", type: "Credit Card", balance: -1000, interestRate: 20 },
      { id: "l", name: "Loan", type: "Loan", balance: -4000, interestRate: 5 },
      { id: "m", name: "Home", type: "Mortgage", balance: -200000, interestRate: 4 },
    ]);
    expect(buildDebtSummary(snapshot)?.totalDebt).toBe(snapshot.getTotalConsumerDebt());
    expect(buildDebtSummary(snapshot)?.totalDebt).toBe(5000);
  });

  it("computes a debt-free date from the engine, never a fixed string", () => {
    const s = buildDebtSummary(
      snap([
        {
          id: "l",
          name: "Loan",
          type: "Loan",
          balance: -1000,
          interestRate: 5,
          monthlyContribution: 100,
        },
      ]),
      new Date("2026-01-15T00:00:00Z"),
    );
    // 1,000 at 5% repaid at 100/mo clears in 11 months from January 2026.
    expect(s?.debtFreeDate).toBe("December 2026");
    expect(JSON.stringify(s)).not.toContain("October 2026");
  });

  it("gives a null debt-free date when payoff is not achievable", () => {
    const s = buildDebtSummary(
      snap([
        {
          id: "l",
          name: "Loan",
          type: "Loan",
          balance: -100000,
          interestRate: 30,
          monthlyContribution: 10,
        },
      ]),
    );
    expect(s?.debtFreeDate).toBeNull();
  });

  it("returns null when total consumer debt is zero", () => {
    expect(
      buildDebtSummary(
        snap([{ id: "l", name: "Loan", type: "Loan", balance: 0, interestRate: 5 }]),
      ),
    ).toBeNull();
  });

  it("gives a null debt-free date when any debt has an unknown APR", () => {
    const s = buildDebtSummary(
      snap([
        {
          id: "l",
          name: "Loan",
          type: "Loan",
          balance: -1000,
          monthlyContribution: 100,
        },
      ]),
    );
    expect(s?.debtFreeDate).toBeNull();
  });
});
