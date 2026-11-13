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
    {
      id: "acc_7",
      name: "Bank Overdraft",
      type: "Overdraft",
      balance: -500,
      interestRate: 39.9,
    },
    {
      id: "acc_8",
      name: "Car Loan",
      type: "Loan",
      balance: -8000,
      interestRate: 8.9,
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
    it("uses account.balance as the current figure; history only describes past months", () => {
      const snapshot = new PortfolioSnapshot(sampleAccounts, sampleDetails);

      expect(snapshot.getLatestBalance("acc_1")).toBe(1500);
      expect(snapshot.getLatestBalance("acc_2")).toBe(10000);
      expect(snapshot.getLatestBalance("acc_5")).toBe(2400);
      expect(snapshot.getLatestBalance("acc_3")).toBe(25000);
    });

    it("correctly enforces signs: liabilities have positive nominalBalance and negative netWorthBalance", () => {
      const snapshot = new PortfolioSnapshot(sampleAccounts, sampleDetails);

      const creditCard = snapshot.getAccount("acc_5");
      expect(creditCard?.isLiability).toBe(true);
      expect(creditCard?.nominalBalance).toBe(2400);
      expect(creditCard?.netWorthBalance).toBe(-2400);

      const mortgage = snapshot.getAccount("acc_6");
      expect(mortgage?.isLiability).toBe(true);
      expect(mortgage?.nominalBalance).toBe(210000);
      expect(mortgage?.netWorthBalance).toBe(-210000);
    });
  });

  describe("aggregations", () => {
    it("calculates total liquid cash", () => {
      const snapshot = new PortfolioSnapshot(sampleAccounts, sampleDetails);
      expect(snapshot.getTotalLiquidCash()).toBe(11500);
    });

    it("calculates specific asset and liability categories", () => {
      const snapshot = new PortfolioSnapshot(sampleAccounts, sampleDetails);
      expect(snapshot.getTotalInvestments()).toBe(25000);
      expect(snapshot.getTotalPensions()).toBe(45000);
      expect(snapshot.getTotalConsumerDebt()).toBe(2400 + 500 + 8000);
      expect(snapshot.getTotalMortgageBalance()).toBe(210000);
    });

    it("calculates total assets and liabilities", () => {
      const snapshot = new PortfolioSnapshot(sampleAccounts, sampleDetails);
      expect(snapshot.getTotalAssets()).toBe(81500);
      expect(snapshot.getTotalLiabilities()).toBe(210000 + 2400 + 500 + 8000);
    });

    it("calculates weighted savings interest rate", () => {
      const snapshot = new PortfolioSnapshot(sampleAccounts, sampleDetails);
      expect(snapshot.getWeightedSavingsRate()).toBeCloseTo(6.37, 2);

      const emptySnapshot = new PortfolioSnapshot([], []);
      expect(emptySnapshot.getWeightedSavingsRate(4.5)).toBe(4.5);
    });
  });

  describe("toDebtItems", () => {
    it("converts debt accounts to DebtItem[] for finance-engine calculations", () => {
      const snapshot = new PortfolioSnapshot(sampleAccounts, sampleDetails);
      const debts = snapshot.toDebtItems();

      expect(debts.length).toBe(3);
      const card = debts.find((d) => d.id === "acc_5")!;
      expect(card.type).toBe("credit_card");

      const overdraft = debts.find((d) => d.id === "acc_7")!;
      expect(overdraft.type).toBe("overdraft");

      const loan = debts.find((d) => d.id === "acc_8")!;
      expect(loan.type).toBe("loan");
    });

    it("a 0% card keeps 0 APR and is flagged as known", () => {
      const snapshot = new PortfolioSnapshot(
        [{ id: "c0", name: "0% card", type: "Credit Card", balance: -1000, interestRate: 0 }],
        [],
      );
      const [debt] = snapshot.toDebtItems();
      expect(debt?.apr).toBe(0);
      expect(debt?.interestRateApr).toBe(0);
      expect(debt?.aprKnown).toBe(true);
    });

    it("null interestRate gives aprKnown false and apr 0, never 19.9", () => {
      const snapshot = new PortfolioSnapshot(
        [{ id: "c1", name: "Card", type: "Credit Card", balance: -1000, interestRate: null }],
        [],
      );
      const [debt] = snapshot.toDebtItems();
      expect(debt?.aprKnown).toBe(false);
      expect(debt?.apr).toBe(0);
      expect(debt?.interestRateApr).toBe(0);
    });

    it("minimumPaymentEstimated is true only when no monthlyContribution is stored", () => {
      const snapshot = new PortfolioSnapshot(
        [
          { id: "e1", name: "No min", type: "Loan", balance: -2000, interestRate: 5 },
          {
            id: "e2",
            name: "Has min",
            type: "Loan",
            balance: -2000,
            interestRate: 5,
            monthlyContribution: 90,
          },
        ],
        [],
      );
      const debts = snapshot.toDebtItems();
      const estimated = debts.find((d) => d.id === "e1");
      const stored = debts.find((d) => d.id === "e2");
      expect(estimated?.minimumPaymentEstimated).toBe(true);
      expect(estimated?.minimumPayment).toBe(50);
      expect(stored?.minimumPaymentEstimated).toBe(false);
      expect(stored?.minimumPayment).toBe(90);
    });
  });

  describe("getMonthlyHistory", () => {
    it("generates chronological history points from account details", () => {
      const snapshot = new PortfolioSnapshot(sampleAccounts, sampleDetails);
      const history = snapshot.getMonthlyHistory(12);

      expect(history.length).toBe(2);
      expect(history[0]?.month).toBe(1);
      expect(history[0]?.totalAssets).toBe(1200 + 8000);
      expect(history[0]?.totalLiabilities).toBe(3000);
      expect(history[0]?.netWorth).toBe(6200);

      expect(history[1]?.month).toBe(2);
      expect(history[1]?.totalAssets).toBe(1800 + 11500);
      expect(history[1]?.totalLiabilities).toBe(2200);
      expect(history[1]?.netWorth).toBe(11100);
    });
  });
});
