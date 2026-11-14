import { describe, expect, it } from "vitest";
import { PortfolioSnapshot } from "../../portfolio.js";
import { selectDebtTotals, selectHomeEstimate, selectNetWorth } from "./portfolio-totals.js";

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
  const owner = { homeValue: 310000, housingStatus: "mortgage" as const };

  it("counts the profile home estimate at 100%, as its own labelled part", () => {
    const nw = selectNetWorth(snapshot, owner);
    expect(nw.homeEstimate).toBe(310000);
    expect(nw.property).toBe(0);
    expect(nw.totalAssets).toBe(13000 + 310000);
    expect(nw.netWorth).toBe(7500 + 310000);
    expect(nw.totalAssets - nw.totalLiabilities).toBe(nw.netWorth);
  });

  it("is not added when a Property account exists, whatever its balance (no double count)", () => {
    const withHome = new PortfolioSnapshot([
      { id: "home", name: "Home", type: "Property", balance: 300000 },
    ]);
    expect(selectHomeEstimate(withHome, owner)).toBe(0);
    expect(selectNetWorth(withHome, owner).netWorth).toBe(300000);
    const zeroHome = new PortfolioSnapshot([
      { id: "home", name: "Home", type: "Property", balance: 0 },
    ]);
    expect(selectHomeEstimate(zeroHome, owner)).toBe(0);
  });

  it("is not counted for a renter, or when the estimate is missing, 0 or negative", () => {
    expect(selectHomeEstimate(snapshot, { ...owner, housingStatus: "renting" })).toBe(0);
    expect(selectHomeEstimate(snapshot, { homeValue: null, housingStatus: "mortgage" })).toBe(0);
    expect(selectHomeEstimate(snapshot, { ...owner, homeValue: 0 })).toBe(0);
    expect(selectHomeEstimate(snapshot, { ...owner, homeValue: -5 })).toBe(0);
    expect(selectHomeEstimate(snapshot, null)).toBe(0);
  });

  it("counts an estimate with housing not answered (only renting rules it out)", () => {
    expect(selectHomeEstimate(snapshot, { homeValue: 250000, housingStatus: null })).toBe(250000);
    expect(selectHomeEstimate(snapshot, { homeValue: 250000 } as never)).toBe(250000);
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
