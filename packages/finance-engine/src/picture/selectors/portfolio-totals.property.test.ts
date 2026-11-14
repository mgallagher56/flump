/**
 * E16 PR 3: property tests for net worth and residential loan to value (fast-check, fixed seed).
 */
import fc from "fast-check";
import { describe, it } from "vitest";
import { DEFAULT_NET_WORTH_BASIS } from "../../net-worth-basis.js";
import { PortfolioSnapshot, type RawAccount } from "../../portfolio.js";
import { selectLoanToValue } from "./loan-to-value.js";
import { HOME_ESTIMATE_LABEL, selectNetWorth } from "./portfolio-totals.js";

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
const NAMES = [HOME_ESTIMATE_LABEL, "Buy-to-let flat", "BTL mortgage", "Joint account"] as const;
const accounts = fc
  .array(fc.record({ row: account, name: fc.constantFrom(...NAMES) }), { maxLength: 8 })
  .map((rows): RawAccount[] => rows.map(({ row, name }, i) => ({ id: `a${i}`, name, ...row })));

describe("net worth and loan to value (properties)", () => {
  it("net worth is always total assets less total liabilities, under any basis", () => {
    const basis = fc.record({ countProperty: fc.boolean(), countStudentLoan: fc.boolean() });
    fc.assert(
      fc.property(accounts, basis, (rows, b) => {
        const nw = selectNetWorth(new PortfolioSnapshot(rows), b);
        return nw.totalAssets - nw.totalLiabilities === nw.netWorth;
      }),
      PARAMS,
    );
  });

  it("the home estimate is part of property, never added on top", () => {
    fc.assert(
      fc.property(accounts, (rows) => {
        const snap = new PortfolioSnapshot(rows);
        const nw = selectNetWorth(snap, DEFAULT_NET_WORTH_BASIS);
        const labelled = rows
          .filter((r) => r.type === "Property" && r.name === HOME_ESTIMATE_LABEL)
          .reduce((sum, r) => sum + Number(r.balance), 0);
        return (
          nw.netWorth === snap.getTotalNetWorth(DEFAULT_NET_WORTH_BASIS) &&
          nw.totalAssets === snap.getTotalAssets(DEFAULT_NET_WORTH_BASIS) &&
          nw.homeEstimate === labelled
        );
      }),
      PARAMS,
    );
  });

  it("loan to value is unknown, or residential mortgages over residential property", () => {
    fc.assert(
      fc.property(accounts, (rows) => {
        const snap = new PortfolioSnapshot(rows);
        const fig = selectLoanToValue(snap);
        if (fig.status === "unknown") return fig.missing.length > 0;
        const residential = rows.filter((r) => !/buy-to-let|btl/i.test(String(r.name)));
        const sum = (type: string, f: (n: number) => number) =>
          residential
            .filter((r) => r.type === type)
            .reduce((total, r) => total + f(Number(r.balance)), 0);
        return (
          fig.value.homeValue > 0 &&
          fig.value.mortgageBalance > 0 &&
          fig.value.homeValue === sum("Property", (n) => n) &&
          fig.value.mortgageBalance === sum("Mortgage", Math.abs)
        );
      }),
      PARAMS,
    );
  });
});
