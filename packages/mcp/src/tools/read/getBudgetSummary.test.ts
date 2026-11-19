import { type BuildContextPackInput, profileFactsFromProfile } from "@flump/finance-engine";
import { describe, expect, it } from "vitest";
import { connectTestClient } from "../../testing/client.js";
import { emptyUser } from "../../testing/personas.js";

type Env = {
  result: Record<string, any> & {
    notes: string[];
    categories: Array<{ category: string; monthlyGbp: number; essential: boolean }>;
  };
  missing: Array<{ field: string; why: string; askUser: string }>;
  provenance: Record<string, string>;
};

const summaryOf = async (data: BuildContextPackInput, args: Record<string, unknown> = {}) => {
  const h = await connectTestClient(data);
  try {
    return (await h.callJson("get_budget_summary", args)) as Env;
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

describe("get_budget_summary", () => {
  it("lists categories by monthly amount, largest first, labelled in entry order", async () => {
    // Anonymised. In entry order "jane's nursery" is the first custom category and "Kids clubs"
    // the second. "Jane's nursery" is the same name, so it shares label 1 and its rows merge:
    // 60 + 50 = 110, above Kids clubs at 100.
    const e = await summaryOf({
      ...emptyUser,
      budgetEntries: [
        entry({ id: "a", category: "jane's nursery", amount: 60 }),
        entry({ id: "b", category: "Kids clubs", amount: 100 }),
        entry({ id: "c", category: "Jane's nursery", amount: 50 }),
      ],
    });
    expect(e.result.categories).toEqual([
      { category: "Custom category 1", monthlyGbp: 110, essential: true },
      { category: "Custom category 2", monthlyGbp: 100, essential: true },
    ]);
  });

  it("keeps different categories as separate rows", async () => {
    const e = await summaryOf({
      ...emptyUser,
      budgetEntries: [
        entry({ id: "a", category: "bills", amount: 80 }),
        entry({ id: "b", category: "living", amount: 20, isEssential: false }),
      ],
    });
    expect(e.result.categories).toEqual([
      { category: "bills", monthlyGbp: 80, essential: true },
      { category: "living", monthlyGbp: 20, essential: false },
    ]);
  });

  it("asks for nothing with income and spending entries, and lists entries only when detailed", async () => {
    const data = {
      ...emptyUser,
      budgetEntries: [
        entry({ id: "pay", category: "income", name: "Pay", amount: 2000, isIncome: true }),
        entry({ id: "food", category: "expenses", name: "Food", amount: 300 }),
      ],
    };
    const concise = await summaryOf(data);
    expect(concise.missing).toEqual([]);
    expect(concise.result.monthlyIncomeGbp).toBe(2000);
    expect("entries" in concise.result).toBe(false);
    expect(concise.provenance).toMatchObject({ totals: "budget_entries" });
    const detailed = await summaryOf(data, { responseFormat: "detailed" });
    expect(detailed.result.entries).toHaveLength(2);
  });

  it("with no budget asks for budget entries and for income", async () => {
    const e = await summaryOf(emptyUser);
    expect(fields(e)).toEqual(["budgetEntries", "monthlyIncome"]);
    expect(e.missing[0]?.why.length).toBeGreaterThan(0);
  });

  it("a linked take-home line with no salary asks for the salary, not for income", async () => {
    const e = await summaryOf({
      ...emptyUser,
      profileFacts: profileFactsFromProfile(null),
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
    expect(fields(e)).toEqual(["salary"]);
  });

  it("names a saved mortgage payment the budget leaves out, as an estimate in whole pounds", async () => {
    const e = await summaryOf({
      ...emptyUser,
      profileFacts: { ...profileFactsFromProfile(null), housingStatus: "mortgage" },
      accounts: [
        {
          id: "m",
          name: "Mortgage",
          type: "Mortgage",
          balance: 200000,
          interestRate: 4,
          termMonths: 240,
        },
      ],
      budgetEntries: [entry({ id: "hi", category: "housing", name: "Home insurance", amount: 30 })],
    });
    // Repayment on £200,000 at 4% over 240 months: r = 0.04 / 12 = 0.0033333,
    // (1 + r)^240 = 2.2226, payment = 200,000 x r / (1 - 1 / 2.2226) = 666.67 / 0.55008 = 1,211.96.
    expect(e.result.savedFiguresNotInBudget).toEqual([
      { figure: "mortgage_payment", monthlyGbp: 1211.96, estimated: true },
    ]);
    // Shown to the pound with an en-GB thousands separator: £1,212, marked as an estimate.
    expect(e.result.notes[1]).toContain("mortgage payment of about £1,212 a month");
  });

  it("names a saved rent the budget leaves out, in whole pounds and not as an estimate", async () => {
    const e = await summaryOf({
      ...emptyUser,
      profileFacts: {
        ...profileFactsFromProfile(null),
        housingStatus: "renting",
        monthlyHousingCost: 950.6,
      },
      budgetEntries: [entry({ id: "hi", category: "housing", name: "Contents cover", amount: 10 })],
    });
    expect(e.result.savedFiguresNotInBudget).toEqual([
      { figure: "rent", monthlyGbp: 950.6, estimated: false },
    ]);
    // £950.60 to the pound is £951.
    expect(e.result.notes[1]).toContain("rent of £951 a month");
  });
});
