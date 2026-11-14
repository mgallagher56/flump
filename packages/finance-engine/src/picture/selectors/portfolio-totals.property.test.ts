/**
 * E16 PR 3: property tests for net worth with the home estimate (fast-check, fixed seed).
 */
import fc from "fast-check";
import { describe, it } from "vitest";
import { PortfolioSnapshot, type RawAccount } from "../../portfolio.js";
import { selectLoanToValue } from "./loan-to-value.js";
import { type HomeFacts, selectNetWorth } from "./portfolio-totals.js";

const PARAMS = { seed: 20261114, numRuns: 300 } as const;

const TYPES = [
  "Current",
  "Saving",
  "Investment",
  "Pension",
  "Property",
  "Mortgage",
  "Credit Card",
  "Loan",
  "Student Loan",
] as const;

const account = fc.record({
  type: fc.constantFrom(...TYPES),
  balance: fc.integer({ min: -5000, max: 900000 }),
});
const accounts = fc
  .array(account, { maxLength: 8 })
  .map((rows): RawAccount[] => rows.map((r, i) => ({ id: `a${i}`, name: `A${i}`, ...r })));
const facts: fc.Arbitrary<HomeFacts | null> = fc.option(
  fc.record({
    homeValue: fc.option(fc.integer({ min: -1000, max: 2000000 }), { nil: null }),
    housingStatus: fc.constantFrom("renting", "mortgage", "own_outright", null),
  }),
  { nil: null },
);

describe("net worth with the home estimate (properties)", () => {
  it("net worth is always total assets less total liabilities", () => {
    fc.assert(
      fc.property(accounts, facts, (rows, f) => {
        const nw = selectNetWorth(new PortfolioSnapshot(rows), f);
        return nw.totalAssets - nw.totalLiabilities === nw.netWorth;
      }),
      PARAMS,
    );
  });

  it("the home is counted at most once: estimate and Property accounts never both", () => {
    fc.assert(
      fc.property(accounts, facts, (rows, f) => {
        const snap = new PortfolioSnapshot(rows);
        const nw = selectNetWorth(snap, f);
        const hasPropertyRow = rows.some((r) => r.type === "Property");
        if (hasPropertyRow) return nw.homeEstimate === 0;
        return nw.homeEstimate === 0 || nw.homeEstimate === f?.homeValue;
      }),
      PARAMS,
    );
  });

  it("with no home value, net worth is unchanged from the account rows alone", () => {
    fc.assert(
      fc.property(accounts, facts, (rows, f) => {
        const snap = new PortfolioSnapshot(rows);
        const without = selectNetWorth(snap, f ? { ...f, homeValue: null } : null);
        return (
          without.homeEstimate === 0 &&
          without.netWorth === snap.getTotalNetWorth() &&
          without.totalAssets === snap.getTotalAssets()
        );
      }),
      PARAMS,
    );
  });

  it("loan to value is unknown, or the mortgage over the home value net worth counts", () => {
    fc.assert(
      fc.property(accounts, facts, (rows, f) => {
        const snap = new PortfolioSnapshot(rows);
        const fig = selectLoanToValue(snap, f);
        if (fig.status === "unknown") return fig.missing.length > 0;
        const nw = selectNetWorth(snap, f);
        return (
          fig.value.homeValue > 0 &&
          fig.value.mortgageBalance > 0 &&
          fig.value.percent >= 0 &&
          fig.value.homeValue === nw.property + nw.homeEstimate &&
          fig.value.mortgageBalance === snap.getTotalMortgageBalance()
        );
      }),
      PARAMS,
    );
  });
});
