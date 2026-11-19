import { describe, expect, it } from "vitest";
import { PortfolioSnapshot } from "../../portfolio.js";
import { selectSavingsTotals } from "./savings-totals.js";

describe("selectSavingsTotals", () => {
  it("adds Saving and Investment accounts only, at the user's share", () => {
    // Saver £4,000 sole (£200 a month), joint ISA-free investment £10,000 at 50% = £5,000
    // (£300 a month stored, £150 at 50%). Current account and pension are not savings.
    // Balance 4,000 + 5,000 = 9,000. Monthly 200 + 150 = 350. Two accounts.
    // Rate: both accounts have a saved rate (0 is a saved rate), weighted by balance:
    // (4,000 x 4 + 5,000 x 0) / 9,000 = 1.777..., rounded to 1.78.
    const totals = selectSavingsTotals(
      new PortfolioSnapshot([
        { id: "c", name: "Current", type: "Current", balance: 1500, monthlyContribution: 999 },
        {
          id: "s",
          name: "Saver",
          type: "Saving",
          balance: 4000,
          interestRate: 4,
          monthlyContribution: 200,
        },
        {
          id: "i",
          name: "Fund",
          type: "Investment",
          balance: 10000,
          interestRate: 0,
          monthlyContribution: 300,
          ownership: "joint",
          sharePercent: 50,
        },
        { id: "p", name: "Pension", type: "Pension", balance: 50000, monthlyContribution: 400 },
      ]),
    );
    expect(totals).toEqual({
      balance: 9000,
      monthlyContributions: 350,
      accountCount: 2,
      weightedRate: 1.78,
    });
  });

  it("has no rate (null, never a default) when the balance is 0", () => {
    // One empty saver: balance 0, no stored monthly amount (adds 0).
    expect(
      selectSavingsTotals(
        new PortfolioSnapshot([{ id: "s", name: "Saver", type: "Saving", balance: 0 }]),
      ),
    ).toEqual({ balance: 0, monthlyContributions: 0, accountCount: 1, weightedRate: null });
  });

  it("has no rate (null, not 0%) when the only account has no saved rate", () => {
    // £10,000 saver with no interest rate stored. An unknown rate is not 0%, so no average.
    expect(
      selectSavingsTotals(
        new PortfolioSnapshot([{ id: "s", name: "Saver", type: "Saving", balance: 10000 }]),
      ).weightedRate,
    ).toBeNull();
  });

  it("weights saved rates by balance", () => {
    // £6,000 at 4% and £4,000 at 2%: (6,000 x 4 + 4,000 x 2) / 10,000 = 32,000 / 10,000 = 3.2.
    expect(
      selectSavingsTotals(
        new PortfolioSnapshot([
          { id: "a", name: "Saver A", type: "Saving", balance: 6000, interestRate: 4 },
          { id: "b", name: "Saver B", type: "Investment", balance: 4000, interestRate: 2 },
        ]),
      ).weightedRate,
    ).toBe(3.2);
  });

  it("has no rate when one account has a saved rate and another does not", () => {
    // £6,000 at 4% and £4,000 with no saved rate: counting the second as 0% would give 2.4,
    // which no account pays, so the average is not set.
    expect(
      selectSavingsTotals(
        new PortfolioSnapshot([
          { id: "a", name: "Saver A", type: "Saving", balance: 6000, interestRate: 4 },
          { id: "b", name: "Saver B", type: "Saving", balance: 4000 },
        ]),
      ).weightedRate,
    ).toBeNull();
  });

  it("is all zero with no accounts", () => {
    expect(selectSavingsTotals(new PortfolioSnapshot([]))).toEqual({
      balance: 0,
      monthlyContributions: 0,
      accountCount: 0,
      weightedRate: null,
    });
  });
});
