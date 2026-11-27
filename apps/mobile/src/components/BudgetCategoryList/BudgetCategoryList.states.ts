import type { BudgetCategoryListProps } from "./BudgetCategoryList";

/** The renter persona's spending (apps/e2e/support/personas.ts), as the engine ranks it. */
const RENTER: BudgetCategoryListProps["rows"] = [
  {
    category: "housing",
    total: 950,
    count: 1,
    notSet: false,
    entries: [{ id: "rent", name: "Rent", figure: { kind: "nameOnly" } }],
  },
  {
    category: "expenses",
    total: 565,
    count: 5,
    notSet: false,
    entries: [
      { id: "groceries", name: "Groceries", figure: { kind: "amount", monthly: 250 } },
      { id: "travel", name: "Travel", figure: { kind: "amount", monthly: 120 } },
    ],
  },
  {
    category: "bills",
    total: 295,
    count: 4,
    notSet: false,
    entries: [{ id: "council", name: "Council tax", figure: { kind: "amount", monthly: 115 } }],
  },
];

/** Named prop sets for the dev gallery and the tests (in place of Storybook stories). */
export const budgetCategoryListStates = {
  renter: { rows: RENTER, metaFor: (c) => (c === "housing" ? "Renting" : undefined) },
  withEdit: { rows: RENTER, onEditBudget: () => undefined },
  notSet: {
    rows: [
      {
        category: "savings",
        total: 0,
        count: 1,
        notSet: true,
        entries: [
          {
            id: "isa",
            name: "ISA saving",
            figure: { kind: "notSet" },
            source: "Linked to Stocks ISA, which has no monthly saving saved",
          },
        ],
      },
    ],
  },
  mortgageLink: {
    rows: [{ ...(RENTER[0] as BudgetCategoryListProps["rows"][number]), total: 1250 }],
    metaFor: () => "Mortgage",
    linkFor: () => () => undefined,
  },
} satisfies Record<string, BudgetCategoryListProps>;
