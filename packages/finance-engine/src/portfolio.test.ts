import { describe, expect, it } from "vitest";
import {
  categorizeAccountType,
  PortfolioSnapshot,
  type RawAccount,
  type RawAccountDetail,
} from "./portfolio.js";

describe("PortfolioSnapshot domain module", () => {
  const sampleAccounts: RawAccount[] = [
    {
      id: "acc_1",
      name: "Monzo Current Account",
      type: "Current",
      balance: 1500,
    },
    {
      id: "acc_2",
      name: "Marcus High Yield Savings",
      type: "Saving",
      balance: 10000,
      interestRate: 4.8,
    },
    {
      id: "acc_3",
      name: "Vanguard S&S ISA",
      type: "Investment",
      balance: 25000,
      interestRate: 7.0,
      monthlyContribution: 400,
    },
    {
      id: "acc_4",
      name: "Workplace Pension",
      type: "Pension",
      balance: 45000,
      monthlyContribution: 350,
    },
    {
      id: "acc_5",
      name: "Barclaycard Platinum",
      type: "Credit Card",
      balance: -2400,
      interestRate: 23.9,
    },
    {
      id: "acc_6",
      name: "Santander Residential Mortgage",
      type: "Mortgage",
      balance: -210000,
      interestRate: 4.2,
    },
  ];

  const sampleDetails: RawAccountDetail[] = [
    // Month 1 details
    { accountId: "acc_1", year: 2026, month: 1, value: 1200 },
    { accountId: "acc_2", year: 2026, month: 1, value: 8000 },
    { accountId: "acc_5", year: 2026, month: 1, value: -3000 },
    // Month 2 details (latest)
    { accountId: "acc_1", year: 2026, month: 2, value: 1800 },
    { accountId: "acc_2", year: 2026, month: 2, value: 11500 },
    { accountId: "acc_5", year: 2026, month: 2, value: -2200 },
  ];

  describe("categorizeAccountType", () => {
    it("maps raw account types to domain categories", () => {
      expect(categorizeAccountType("Current")).toBe("cash");
      expect(categorizeAccountType("checking")).toBe("cash");
      expect(categorizeAccountType("Saving")).toBe("savings");
      expect(categorizeAccountType("Investment")).toBe("investments");
      expect(categorizeAccountType("Pension")).toBe("pensions");
      expect(categorizeAccountType("Credit Card")).toBe("debt");
      expect(categorizeAccountType("Loan")).toBe("debt");
      expect(categorizeAccountType("Mortgage")).toBe("mortgages");
      expect(categorizeAccountType("Unknown")).toBe("other");
    });
  });

  describe("balance resolution", () => {
    it("prefers latest chronological AccountDetail over static Account.balance", () => {
      const snapshot = new PortfolioSnapshot(sampleAccounts, sampleDetails);

      // acc_1 had static balance 1500, but latest detail is 1800
      expect(snapshot.getLatestBalance("acc_1")).toBe(1800);
      // acc_2 had static balance 10000, but latest detail is 11500
      expect(snapshot.getLatestBalance("acc_2")).toBe(11500);
      // acc_5 had static balance -2400, but latest detail is -2200
      expect(snapshot.getLatestBalance("acc_5")).toBe(2200);

      // acc_3 had no details, so falls back to static balance 25000
      expect(snapshot.getLatestBalance("acc_3")).toBe(25000);
    });

    it("correctly enforces signs: liabilities have positive nominalBalance and negative netWorthBalance", () => {
      const snapshot = new PortfolioSnapshot(sampleAccounts, sampleDetails);

      const creditCard = snapshot.getAccount("acc_5");
      expect(creditCard?.isLiability).toBe(true);
      expect(creditCard?.nominalBalance).toBe(2200);
      expect(creditCard?.netWorthBalance).toBe(-2200);

      const mortgage = snapshot.getAccount("acc_6");
      expect(mortgage?.isLiability).toBe(true);
      expect(mortgage?.nominalBalance).toBe(210000);
      expect(mortgage?.netWorthBalance).toBe(-210000);
    });
  });

  describe("aggregations", () => {
    it("calculates total liquid cash", () => {
      const snapshot = new PortfolioSnapshot(sampleAccounts, sampleDetails);
      // Cash (1800) + Savings (11500) = 13300
      expect(snapshot.getTotalLiquidCash()).toBe(13300);
    });

    it("calculates total assets and liabilities", () => {
      const snapshot = new PortfolioSnapshot(sampleAccounts, sampleDetails);
      // Assets: Cash 1800 + Savings 11500 + Inv 25000 + Pension 45000 = 83300
      expect(snapshot.getTotalAssets()).toBe(83300);
      // Liabilities: CC 2200 + Mortgage 210000 = 212200
      expect(snapshot.getTotalLiabilities()).toBe(212200);
      // Net worth: 83300 - 212200 = -128900
      expect(snapshot.getTotalNetWorth()).toBe(-128900);
    });

    it("calculates weighted savings interest rate", () => {
      const snapshot = new PortfolioSnapshot(sampleAccounts, sampleDetails);
      // Savings (11500 @ 4.8%) + Inv (25000 @ 7.0%)
      // (11500*4.8 + 25000*7.0) / 36500 = (55200 + 175000) / 36500 = 230200 / 36500 = 6.31%
      expect(snapshot.getWeightedSavingsRate()).toBeCloseTo(6.31, 2);
    });
  });

  describe("toDebtItems", () => {
    it("converts debt accounts to DebtItem[] for finance-engine calculations", () => {
      const snapshot = new PortfolioSnapshot(sampleAccounts, sampleDetails);
      const debts = snapshot.toDebtItems();

      expect(debts.length).toBe(1);
      const card = debts[0]!;
      expect(card.id).toBe("acc_5");
      expect(card.name).toBe("Barclaycard Platinum");
      expect(card.balance).toBe(2200);
      expect(card.apr).toBe(23.9);
      expect(card.type).toBe("credit_card");
      expect(card.minimumPayment).toBeGreaterThanOrEqual(25);
    });
  });

  describe("getMonthlyHistory", () => {
    it("generates chronological history points from account details", () => {
      const snapshot = new PortfolioSnapshot(sampleAccounts, sampleDetails);
      const history = snapshot.getMonthlyHistory(12);

      expect(history.length).toBe(2);
      expect(history[0]?.month).toBe(1);
      expect(history[0]?.totalAssets).toBe(1200 + 8000); // 9200
      expect(history[0]?.totalLiabilities).toBe(3000);
      expect(history[0]?.netWorth).toBe(6200);

      expect(history[1]?.month).toBe(2);
      expect(history[1]?.totalAssets).toBe(1800 + 11500); // 13300
      expect(history[1]?.totalLiabilities).toBe(2200);
      expect(history[1]?.netWorth).toBe(11100);
    });
  });
});
