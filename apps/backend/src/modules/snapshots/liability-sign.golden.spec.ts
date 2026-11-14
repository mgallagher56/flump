import {
  buildFinancialPicture,
  PortfolioSnapshot,
  type RawAccount,
  type RawAccountDetail,
} from "@flump/finance-engine";
import { PERSONAS, type PersonaFixture } from "@flump/finance-engine/testing";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { isStoredNegativeAccountType, storedBalance } from "./stored-balance";

// BE-05 golden test (audit H6). The E23 personas store their debts positive: exactly the rows
// account creation wrote before BE-05. The backfill re-signs them with the same rule the write
// paths use. Every figure the dashboard shows (net worth, assets, liabilities, debt totals, the
// monthly history and the financial picture) must be the same before and after: the engine reads
// a liability's magnitude, so correcting the sign must never move a total. What it does correct
// is the raw stored number that API responses, MCP tools, exports and SQL sums read.
const AS_OF = new Date("2026-11-14T12:00:00Z");

/** What the migration does to one user's rows: liability balance and history to -|value|. */
function backfill(fixture: PersonaFixture): PersonaFixture {
  const typeById = new Map(fixture.accounts.map((a) => [String(a.id), String(a.type)]));
  return {
    ...fixture,
    accounts: fixture.accounts.map(
      (a): RawAccount => ({ ...a, balance: storedBalance(String(a.type), Number(a.balance)) }),
    ),
    details: fixture.details.map(
      (d): RawAccountDetail => ({
        ...d,
        value: storedBalance(typeById.get(String(d.accountId ?? d.account_id)), Number(d.value)),
      }),
    ),
  };
}

/** Every total a user sees, from the same engine calls the backend and web make. */
function figures(fixture: PersonaFixture) {
  const snapshot = new PortfolioSnapshot(fixture.accounts, fixture.details);
  const picture = buildFinancialPicture(fixture, { snapshot, taxYear: "2026/27", asOf: AS_OF });
  return {
    netWorth: snapshot.getTotalNetWorth(fixture.netWorthBasis),
    totalAssets: snapshot.getTotalAssets(fixture.netWorthBasis),
    totalLiabilities: snapshot.getTotalLiabilities(fixture.netWorthBasis),
    totalLiquidCash: snapshot.getTotalLiquidCash(),
    totalConsumerDebt: snapshot.getTotalConsumerDebt(),
    totalMortgageBalance: snapshot.getTotalMortgageBalance(),
    totalStudentLoans: snapshot.getTotalStudentLoans(),
    totalProperty: snapshot.getTotalProperty(),
    history: snapshot.getMonthlyHistory(fixture.netWorthBasis, 24),
    pictureNetWorth: picture.netWorth,
    pictureDebt: picture.debt,
  };
}

describe("liability sign backfill against the E23 personas (golden)", () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(AS_OF);
  });
  afterAll(() => {
    vi.useRealTimers();
  });

  for (const [name, { fixture }] of Object.entries(PERSONAS)) {
    describe(name, () => {
      const corrected = backfill(fixture);

      it("keeps every net worth and debt figure unchanged", () => {
        expect(figures(corrected)).toEqual(figures(fixture));
      });

      it("is a no-op on data that is already right (idempotent)", () => {
        expect(backfill(corrected)).toEqual(corrected);
        expect(figures(backfill(corrected))).toEqual(figures(corrected));
      });

      it("corrects the stored sign of every liability and leaves every asset as it was", () => {
        const typeById = new Map(fixture.accounts.map((a) => [String(a.id), String(a.type)]));
        corrected.accounts.forEach((a, i) => {
          const before = Number(fixture.accounts[i]?.balance);
          const after = Number(a.balance);
          if (isStoredNegativeAccountType(String(a.type))) {
            expect(after, `${a.name}`).toBe(before === 0 ? 0 : -Math.abs(before));
          } else {
            expect(after, `${a.name}`).toBe(before);
          }
        });
        corrected.details.forEach((d, i) => {
          const type = typeById.get(String(d.accountId ?? d.account_id));
          const before = Number(fixture.details[i]?.value);
          if (isStoredNegativeAccountType(type)) expect(Number(d.value)).toBeLessThanOrEqual(0);
          else expect(Number(d.value)).toBe(before);
        });
      });
    });
  }

  it("covers personas that had wrong-sign debts, a Student Loan among them", () => {
    const wrong = Object.values(PERSONAS).flatMap(({ fixture }) =>
      fixture.accounts.filter(
        (a) => isStoredNegativeAccountType(String(a.type)) && Number(a.balance) > 0,
      ),
    );
    expect(wrong.length).toBeGreaterThan(0);
    expect(wrong.some((a) => a.type === "Student Loan")).toBe(true);
  });
});
