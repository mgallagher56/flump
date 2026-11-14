/**
 * E23 section 9.5 (D-11): property tests for PortfolioSnapshot using fast-check.
 * A fixed seed keeps CI deterministic.
 */
import fc from "fast-check";
import { describe, it } from "vitest";
import { DEFAULT_NET_WORTH_BASIS } from "./net-worth-basis.js";
import { PortfolioSnapshot, type RawAccount, type RawAccountDetail } from "./portfolio.js";

const PARAMS = { seed: 20260101, numRuns: 200 } as const;
const pounds = fc.integer({ min: -2_000_000, max: 2_000_000 }); // pence-free whole pounds
const positive = fc.integer({ min: 1, max: 1_000_000 });

const assetType = fc.constantFrom("Current", "Saving", "Investment", "Pension", "Property");
const liabilityType = fc.constantFrom("Credit Card", "Loan", "Mortgage", "Overdraft");
const anyType = fc.oneof(assetType, liabilityType, fc.constant("Student Loan"));

const account = (id: string) =>
  fc.record({ id: fc.constant(id), type: anyType, balance: pounds }) as fc.Arbitrary<RawAccount>;

const accountList = fc
  .integer({ min: 0, max: 8 })
  .chain((n) => fc.tuple(...Array.from({ length: n }, (_, i) => account(`a${i}`))));

const isLiab = (t: string) => ["Credit Card", "Loan", "Mortgage", "Overdraft"].includes(t);

function expectedNetWorth(accounts: RawAccount[]): number {
  return accounts.reduce((sum, a) => {
    const t = String(a.type);
    const b = Number(a.balance);
    if (t === "Student Loan") return sum;
    return sum + (isLiab(t) ? -Math.abs(b) : b);
  }, 0);
}

describe("PortfolioSnapshot properties", () => {
  it("net worth equals the sum of signed balances, excluding student loans", () => {
    fc.assert(
      fc.property(accountList, (accounts) => {
        const snap = new PortfolioSnapshot(accounts, []);
        return (
          snap.getTotalNetWorth(DEFAULT_NET_WORTH_BASIS) === expectedNetWorth(accounts) &&
          snap.getTotalAssets(DEFAULT_NET_WORTH_BASIS) -
            snap.getTotalLiabilities(DEFAULT_NET_WORTH_BASIS) ===
            snap.getTotalNetWorth(DEFAULT_NET_WORTH_BASIS)
        );
      }),
      PARAMS,
    );
  });

  it("moving x between two asset accounts leaves net worth unchanged", () => {
    fc.assert(
      fc.property(
        accountList,
        assetType,
        assetType,
        pounds,
        pounds,
        positive,
        (others, t1, t2, b1, b2, x) => {
          const before: RawAccount[] = [
            ...others,
            { id: "m1", type: t1, balance: b1 },
            { id: "m2", type: t2, balance: b2 },
          ];
          const after: RawAccount[] = [
            ...others,
            { id: "m1", type: t1, balance: b1 - x },
            { id: "m2", type: t2, balance: b2 + x },
          ];
          return (
            new PortfolioSnapshot(before, []).getTotalNetWorth(DEFAULT_NET_WORTH_BASIS) ===
            new PortfolioSnapshot(after, []).getTotalNetWorth(DEFAULT_NET_WORTH_BASIS)
          );
        },
      ),
      PARAMS,
    );
  });

  it("adding a liability of x lowers net worth by exactly x", () => {
    fc.assert(
      fc.property(accountList, liabilityType, pounds, (accounts, type, stored) => {
        const x = Math.abs(stored);
        const before = new PortfolioSnapshot(accounts, []).getTotalNetWorth(
          DEFAULT_NET_WORTH_BASIS,
        );
        const after = new PortfolioSnapshot(
          [...accounts, { id: "liab", type, balance: stored }],
          [],
        ).getTotalNetWorth(DEFAULT_NET_WORTH_BASIS);
        return after === before - x;
      }),
      PARAMS,
    );
  });

  it("an overdrawn current account lowers net worth by |x| and raises consumer debt by |x|", () => {
    fc.assert(
      fc.property(accountList, positive, (accounts, x) => {
        const before = new PortfolioSnapshot(accounts, []);
        const after = new PortfolioSnapshot(
          [...accounts, { id: "od", type: "Current", balance: -x }],
          [],
        );
        return (
          after.getTotalNetWorth(DEFAULT_NET_WORTH_BASIS) ===
            before.getTotalNetWorth(DEFAULT_NET_WORTH_BASIS) - x &&
          after.getTotalConsumerDebt() === before.getTotalConsumerDebt() + x
        );
      }),
      PARAMS,
    );
  });

  it("history at month m equals the sum of last known values at or before m", () => {
    const rows = fc.array(
      fc.record({
        accountId: fc.constantFrom("s1", "s2", "s3"),
        year: fc.integer({ min: 2024, max: 2026 }),
        month: fc.integer({ min: 1, max: 12 }),
        value: fc.integer({ min: 0, max: 500_000 }),
      }),
      { minLength: 1, maxLength: 30 },
    );

    fc.assert(
      fc.property(rows, (details) => {
        const accounts: RawAccount[] = ["s1", "s2", "s3"].map((id) => ({
          id,
          type: "Saving",
          balance: 0,
        }));
        const snap = new PortfolioSnapshot(accounts, details as RawAccountDetail[]);
        const history = snap.getMonthlyHistory(DEFAULT_NET_WORTH_BASIS, 1000);

        // Reference model: last row wins per (account, month), then last known at or before m.
        const byKey = new Map<string, number>();
        for (const d of details) byKey.set(`${d.accountId}:${d.year * 12 + d.month}`, d.value);

        return history.every((point) => {
          const m = point.year * 12 + point.month;
          let expected = 0;
          for (const id of ["s1", "s2", "s3"]) {
            for (let i = m; i >= 2024 * 12; i--) {
              const v = byKey.get(`${id}:${i}`);
              if (v !== undefined) {
                expected += v;
                break;
              }
            }
          }
          return point.netWorth === expected;
        });
      }),
      PARAMS,
    );
  });
});
