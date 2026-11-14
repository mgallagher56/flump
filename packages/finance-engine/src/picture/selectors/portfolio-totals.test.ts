import { describe, expect, it } from "vitest";
import { PortfolioSnapshot } from "../../portfolio.js";
import {
  HOME_ESTIMATE_LABEL,
  selectDebtTotals,
  selectHomeEstimate,
  selectNetWorth,
} from "./portfolio-totals.js";

const snapshot = new PortfolioSnapshot([
  { id: "cur", name: "Current", type: "Current", balance: -300 },
  { id: "sav", name: "Saver", type: "Saving", balance: 5000 },
  { id: "isa", name: "ISA", type: "Investment", balance: 8000 },
  {
    id: "card",
    name: "Card",
    type: "Credit Card",
    balance: 1200,
    interestRate: 22,
    monthlyContribution: 60,
  },
  { id: "loan", name: "Loan", type: "Loan", balance: 4000, interestRate: null },
]);

describe("selectNetWorth", () => {
  it("is assets less liabilities, with an overdraft as a liability, not netted cash", () => {
    const nw = selectNetWorth(snapshot);
    expect(nw.totalAssets).toBe(13000);
    expect(nw.totalLiabilities).toBe(5500);
    expect(nw.netWorth).toBe(7500);
    expect(nw.liquidCash).toBe(5000);
    expect(nw.investments).toBe(8000);
  });

  it("is a real £0 with no accounts", () => {
    expect(selectNetWorth(new PortfolioSnapshot([])).netWorth).toBe(0);
  });
});

describe("home estimate in net worth (E16 D3, option a)", () => {
  const seeded = new PortfolioSnapshot([
    { id: "sav", name: "Saver", type: "Saving", balance: 5000 },
    { id: "home", name: HOME_ESTIMATE_LABEL, type: "Property", balance: 310000 },
  ]);

  it("is the seeded Property account, counted once inside property, assets and net worth", () => {
    const nw = selectNetWorth(seeded);
    expect(nw.homeEstimate).toBe(310000);
    expect(nw.property).toBe(310000);
    expect(nw.totalAssets).toBe(315000);
    expect(nw.netWorth).toBe(315000);
    expect(nw.totalAssets - nw.totalLiabilities).toBe(nw.netWorth);
  });

  it("only the account labelled with the home estimate is labelled; other property is not", () => {
    const other = new PortfolioSnapshot([
      { id: "flat", name: "Buy-to-let flat", type: "Property", balance: 200000 },
    ]);
    expect(selectHomeEstimate(other)).toBe(0);
    expect(selectNetWorth(other).property).toBe(200000);
  });

  it("is 0 with no home account", () => {
    expect(selectHomeEstimate(snapshot)).toBe(0);
    expect(selectNetWorth(snapshot).homeEstimate).toBe(0);
  });
});

describe("selectDebtTotals", () => {
  it("counts the overdraft in total debt but not as a payoff item", () => {
    const debt = selectDebtTotals(snapshot);
    expect(debt.consumerDebt).toBe(5500);
    expect(debt.debtCount).toBe(2);
    expect(debt.minimumsEstimated).toBe(true);
    // Stored 60 plus an estimate for the loan.
    expect(debt.monthlyMinimums).toBeGreaterThan(60);
  });
});
