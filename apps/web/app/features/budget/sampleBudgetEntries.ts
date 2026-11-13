import type { BudgetEntry } from "~/types/budget";

const entry = (over: Partial<BudgetEntry>): BudgetEntry => ({
  id: "e",
  userId: "u",
  category: "expenses",
  name: "Item",
  amount: 100,
  frequency: "monthly",
  isEssential: true,
  isIncome: false,
  isPrimaryIncome: false,
  isDefault: false,
  notes: null,
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
  ...over,
});

/** Realistic plan for stories: 14 entries, 7 spending categories, one renewal inside 30 days. */
export const sampleBudgetEntries = (): BudgetEntry[] => {
  const soon = new Date(Date.now() + 12 * 86_400_000).toISOString().slice(0, 10);
  return [
    entry({
      id: "i1",
      category: "income",
      name: "Salary",
      amount: 3400,
      isIncome: true,
      isPrimaryIncome: true,
    }),
    entry({ id: "h1", category: "housing", name: "Mortgage", amount: 1150 }),
    entry({ id: "h2", category: "housing", name: "Council tax", amount: 168 }),
    entry({ id: "b1", category: "bills", name: "Energy", amount: 130 }),
    entry({ id: "b2", category: "bills", name: "Broadband", amount: 32, contractEndDate: soon }),
    entry({ id: "b3", category: "bills", name: "Mobile", amount: 18 }),
    entry({ id: "x1", category: "expenses", name: "Groceries", amount: 380 }),
    entry({ id: "x2", category: "expenses", name: "Dining out", amount: 140, isEssential: false }),
    entry({ id: "x3", category: "expenses", name: "Credit card", amount: 90 }),
    entry({ id: "s1", category: "savings", name: "Rainy day pot", amount: 250 }),
    entry({ id: "t1", category: "transport", name: "Fuel and parking", amount: 160 }),
    entry({ id: "t2", category: "pets", name: "Pet insurance", amount: 28 }),
    entry({
      id: "t3",
      category: "holidays",
      name: "Holiday fund",
      amount: 120,
      isEssential: false,
    }),
    entry({ id: "t4", category: "children", name: "Clubs", amount: 75 }),
  ];
};
