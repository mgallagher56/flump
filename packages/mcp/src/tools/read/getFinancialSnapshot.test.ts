import {
  type BuildContextPackInput,
  getUkCalendarDate,
  profileFactsFromProfile,
} from "@flump/finance-engine";
import { describe, expect, it, vi } from "vitest";
import { connectTestClient } from "../../testing/client.js";
import { emptyUser, mixedAccountsWithHistory } from "../../testing/personas.js";

type Env = {
  result: Record<string, any> & { notes: string[] };
  missing: Array<{ field: string; why: string; askUser: string }>;
  assumptions: Array<{ field: string; source: string; reason: string }>;
  provenance: Record<string, string>;
};

const snapshotOf = async (data: BuildContextPackInput, args: Record<string, unknown> = {}) => {
  const h = await connectTestClient(data);
  try {
    return (await h.callJson("get_financial_snapshot", args)) as Env;
  } finally {
    await h.close();
  }
};
const fields = (e: Env) => e.missing.map((m) => m.field);

const entry = (over: Record<string, unknown>) => ({
  id: "e",
  category: "bills",
  name: "Entry",
  amount: 0,
  frequency: "monthly",
  isIncome: false,
  isEssential: true,
  ...over,
});

describe("get_financial_snapshot: current figures", () => {
  it("names where each figure comes from when the budget has income and essentials", async () => {
    const e = await snapshotOf(mixedAccountsWithHistory);
    expect(e.provenance).toMatchObject({
      netWorthGbp: "account_balances",
      debtCount: "account_balances",
      monthlyIncomeGbp: "budget_entries",
      monthlySurplusAfterStoredMinimumsGbp: "budget_entries",
      emergencyRunwayMonths: "account_balances_and_budget_entries",
    });
    expect(fields(e)).not.toContain("monthlyIncome");
    expect(fields(e)).not.toContain("monthlyEssentialSpendGbp");
    expect(fields(e)).not.toContain("accounts");
    for (const n of e.result.notes) expect(n.length).toBeGreaterThan(0);
  });

  it("counts only the debts with no saved minimum in the estimate it flags", async () => {
    // The loan stores a £200 minimum; the card stores none: 1 of the 2 debts is estimated.
    const e = await snapshotOf(mixedAccountsWithHistory);
    expect(e.assumptions).toHaveLength(1);
    expect(e.assumptions[0]?.reason).toContain("for 1 of the debts");
    const debts = e.missing.find((m) => m.field === "debts.minimumPayment");
    expect(debts?.why).toContain("for 1 of the debts");
    expect(debts?.askUser.length).toBeGreaterThan(0);
  });

  it("flags no estimate when every debt has a saved minimum", async () => {
    const e = await snapshotOf({
      ...mixedAccountsWithHistory,
      accounts: (mixedAccountsWithHistory.accounts ?? []).map((a) =>
        a.type === "Credit Card" ? { ...a, monthlyContribution: 75 } : a,
      ),
    });
    expect(e.assumptions).toEqual([]);
    expect(fields(e)).not.toContain("debts.minimumPayment");
  });

  it("with nothing recorded asks for accounts, income and essentials, and marks income unavailable", async () => {
    const e = await snapshotOf(emptyUser);
    expect(fields(e)).toEqual(["accounts", "monthlyIncome", "monthlyEssentialSpendGbp"]);
    const essentials = e.missing[2];
    expect(essentials?.why.length).toBeGreaterThan(0);
    expect(essentials?.askUser.length).toBeGreaterThan(0);
    expect(e.provenance).toMatchObject({
      monthlyIncomeGbp: "not_available",
      monthlySurplusAfterStoredMinimumsGbp: "not_available",
    });
    expect(e.provenance.emergencyRunwayMonths).toBeUndefined();
  });

  it("asks for income when the budget has spending but no income entry", async () => {
    const e = await snapshotOf({
      ...emptyUser,
      accounts: [{ id: "c", name: "Current", type: "Current", balance: 2000 }],
      budgetEntries: [entry({ id: "rent", category: "housing", name: "Rent", amount: 1000 })],
    });
    expect(e.result.monthlyIncomeGbp).toBeNull();
    // Essentials are known (rent 1,000), so breathing room is worked out and not asked for.
    expect(fields(e)).toEqual(["monthlyIncome"]);
  });

  it("a linked take-home line with no salary asks for the salary, not for income", async () => {
    const e = await snapshotOf({
      ...emptyUser,
      profileFacts: profileFactsFromProfile(null),
      accounts: [{ id: "c", name: "Current", type: "Current", balance: 2000 }],
      budgetEntries: [
        entry({
          id: "pay",
          category: "income",
          name: "Pay",
          isIncome: true,
          linkKind: "take_home",
        }),
        entry({ id: "food", category: "expenses", name: "Food", amount: 300 }),
      ],
    });
    expect(e.result.monthlyIncomeGbp).toBeNull();
    expect(fields(e)).toContain("salary");
    expect(fields(e)).not.toContain("monthlyIncome");
  });

  it("a linked housing line that is set does not stand in for a missing income entry", async () => {
    // Rent £950 saved, so the linked housing line is set; no income entry and no salary saved.
    const e = await snapshotOf({
      ...emptyUser,
      profileFacts: {
        ...profileFactsFromProfile(null),
        housingStatus: "renting",
        monthlyHousingCost: 950,
      },
      accounts: [{ id: "c", name: "Current", type: "Current", balance: 2000 }],
      budgetEntries: [
        entry({ id: "rent", category: "housing", name: "Rent", linkKind: "housing" }),
      ],
    });
    expect(e.result.monthlyIncomeGbp).toBeNull();
    expect(fields(e)).toEqual(["monthlyIncome"]);
  });

  it("a linked housing line with no saved payment asks for the payment, not for essentials or income", async () => {
    const e = await snapshotOf({
      ...emptyUser,
      profileFacts: { ...profileFactsFromProfile(null), housingStatus: "renting" },
      accounts: [{ id: "c", name: "Current", type: "Current", balance: 2000 }],
      budgetEntries: [
        entry({ id: "pay", category: "income", name: "Pay", isIncome: true, amount: 2000 }),
        entry({ id: "rent", category: "housing", name: "Rent", linkKind: "housing" }),
      ],
    });
    expect(e.result.emergencyRunwayMonths).toBeNull();
    expect(fields(e)).toEqual(["monthlyHousingCost"]);
  });
});

describe("get_financial_snapshot: a past month", () => {
  const now = getUkCalendarDate(new Date()).slice(0, 7);
  /** Current recorded in August 2024, saver last recorded in June 2024, card never recorded. */
  const history: BuildContextPackInput = {
    ...emptyUser,
    accounts: [
      { id: "c", name: "Current", type: "Current", balance: 900 },
      { id: "s", name: "Saver", type: "Saving", balance: 5000 },
      { id: "k", name: "Card", type: "Credit Card", balance: 300 },
    ],
    accountDetails: [
      { accountId: "c", year: 2024, month: 8, value: 500 },
      { accountId: "s", year: 2024, month: 6, value: 1000 },
    ],
  };

  it("counts only the accounts with a value that month, and says how many carry forward", async () => {
    const e = await snapshotOf(history, { asOfMonth: "2024-08" });
    // Current 500 (recorded) + saver 1,000 (carried from June); the card has no value.
    expect(e.result).toMatchObject({ netWorthGbp: 1500, accountCount: 2, debtCount: 0 });
    // One of the two counted accounts (the saver) repeats an earlier value.
    expect(e.result.notes[0]).toContain("1 of 2");
    for (const n of e.result.notes) expect(n.length).toBeGreaterThan(0);
    // Three accounts, two with values: 3 - 2 = 1 left out.
    expect(fields(e)).toEqual(["accountHistory.accounts"]);
    expect(e.missing[0]?.why).toContain("1 of 3");
    expect(e.missing[0]?.askUser.length).toBeGreaterThan(0);
    expect(e.provenance).toMatchObject({
      netWorthGbp: "account_history",
      monthlyIncomeGbp: "not_historical",
    });
  });

  it("asks for nothing when every account has a value that month", async () => {
    const e = await snapshotOf(
      { ...history, accounts: (history.accounts ?? []).filter((a) => a.id !== "k") },
      { asOfMonth: "2024-08" },
    );
    expect(e.missing).toEqual([]);
  });

  it("asks for history when no account has a value on or before that month", async () => {
    const e = await snapshotOf(history, { asOfMonth: "2024-05" });
    expect(fields(e)).toEqual(["accountHistory"]);
    expect(e.missing[0]?.why).toContain("2024-05");
    expect(e.missing[0]?.askUser.length).toBeGreaterThan(0);
  });

  it("asks for accounts when there are none, without reading any rows", async () => {
    const h = await connectTestClient(emptyUser);
    const spy = vi.spyOn(h.provider, "getAccountSnapshots");
    try {
      const e = (await h.callJson("get_financial_snapshot", { asOfMonth: "2024-08" })) as Env;
      expect(fields(e)).toEqual(["accounts"]);
      expect(spy).not.toHaveBeenCalled();
    } finally {
      await h.close();
    }
  });

  it("accepts the current month", async () => {
    const e = await snapshotOf(history, { asOfMonth: now });
    expect(e.result.asOfMonth).toBe(now);
  });
});
