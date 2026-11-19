import type { BuildContextPackInput } from "@flump/finance-engine";
import { describe, expect, it } from "vitest";
import { shortId, shortIdKey } from "../../short-ids.js";
import { connectTestClient, TEST_TOKEN } from "../../testing/client.js";
import { emptyUser } from "../../testing/personas.js";

type Row = Record<string, unknown> & { id: string };
type Env = {
  result: { accounts: Row[]; returnedCount: number };
  missing: Array<{ field: string; why: string; askUser: string }>;
  provenance: Record<string, string>;
};

const listOf = async (data: BuildContextPackInput, args: Record<string, unknown> = {}) => {
  const h = await connectTestClient(data);
  try {
    return (await h.callJson("list_accounts", args)) as Env;
  } finally {
    await h.close();
  }
};
const acc = (uuid: string) => shortId(shortIdKey(TEST_TOKEN), "acc", uuid);

describe("list_accounts", () => {
  it("reports stored mortgage terms only when they are well formed", async () => {
    const mortgage = (id: string, extra: Record<string, unknown>) =>
      ({ id, name: "Mortgage", type: "Mortgage", balance: 100000, ...extra }) as never;
    const e = await listOf({
      ...emptyUser,
      accounts: [
        // A term of 0 months is a stored, valid term; the date is a plain YYYY-MM-DD.
        mortgage("m1", { termMonths: 0, fixedRateEndDate: "2027-06-30" }),
        // A part month is not a term; text before the date is not a date.
        mortgage("m2", { termMonths: 12.5, fixedRateEndDate: "x2027-06-30" }),
        // A null term is not stored; text after the date is not a date.
        mortgage("m3", { termMonths: null, fixedRateEndDate: "2027-06-30x" }),
        // Nothing stored.
        mortgage("m4", {}),
      ],
    });
    const byId = Object.fromEntries(e.result.accounts.map((a) => [a.id, a]));
    expect(byId[acc("m1")]).toMatchObject({ termMonths: 0, fixedRateEndDate: "2027-06-30" });
    for (const id of ["m2", "m3", "m4"]) {
      expect(byId[acc(id)], id).toMatchObject({ termMonths: null, fixedRateEndDate: null });
    }
    expect(e.provenance).toMatchObject({ accounts: "account_balances" });
  });

  it("gives the monthly contribution on pensions only", async () => {
    const e = await listOf({
      ...emptyUser,
      accounts: [
        { id: "p", name: "Pension", type: "Pension", balance: 1000, monthlyContribution: 150 },
        { id: "s", name: "Saver", type: "Saving", balance: 500, monthlyContribution: 50 },
      ],
    });
    const byId = Object.fromEntries(e.result.accounts.map((a) => [a.id, a]));
    expect(byId[acc("p")]).toMatchObject({ monthlyContributionGbp: 150 });
    expect("monthlyContributionGbp" in (byId[acc("s")] ?? {})).toBe(false);
  });

  it("refers to a debt with no APR by its fixed reference in the question", async () => {
    const e = await listOf({
      ...emptyUser,
      accounts: [{ id: "k", name: "Amex Gold", type: "Credit Card", balance: 300 }],
    });
    expect(e.missing).toHaveLength(1);
    expect(e.missing[0]?.field).toBe(`accounts.${acc("k")}.interestRatePct`);
    expect(e.missing[0]?.why).toContain(`Debt account #1 (${acc("k")})`);
    expect(e.missing[0]?.askUser).toContain("Debt account #1");
  });

  it("folds more than five debts with no APR into one entry with the count", async () => {
    const cards = [1, 2, 3, 4, 5, 6].map((i) => ({
      id: `k${i}`,
      name: "Card",
      type: "Credit Card",
      balance: 100,
    }));
    const e = await listOf({ ...emptyUser, accounts: cards });
    // Six debts, four listed one by one: 6 - 4 = 2 more in the folded entry.
    expect(e.missing).toHaveLength(5);
    expect(e.missing[4]?.field).toBe("accounts.interestRatePct");
    expect(e.missing[4]?.why).toMatch(/\S \(2 more not listed\.\)$/);
    expect(e.missing[4]?.askUser.length).toBeGreaterThan(0);
  });
});
