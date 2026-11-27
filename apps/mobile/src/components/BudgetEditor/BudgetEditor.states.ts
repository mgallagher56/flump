import type { BudgetEditorProps } from "./BudgetEditor";

const noop = () => undefined;

/** Named prop sets for the dev gallery and the tests (in place of Storybook stories). */
export const budgetEditorStates = {
  renter: {
    sections: [
      {
        category: "income",
        rows: [
          {
            id: "salary",
            name: "Salary after tax",
            amount: 2085,
            frequency: "monthly",
            editable: true,
          },
        ],
      },
      {
        category: "housing",
        rows: [{ id: "rent", name: "Rent", amount: 950, frequency: "monthly", editable: true }],
      },
      {
        category: "bills",
        rows: [
          {
            id: "shared",
            name: "Shared energy",
            amount: 1200,
            frequency: "annual",
            editable: false,
          },
        ],
      },
      { category: "savings", rows: [] },
    ],
    onEdit: noop,
    onAdd: noop,
    onOpenWebsite: noop,
    onFinish: noop,
  },
  linkedNotSet: {
    sections: [
      {
        category: "income",
        rows: [
          {
            id: "take-home",
            name: "Take-home pay",
            amount: null,
            frequency: "monthly",
            editable: false,
          },
        ],
      },
    ],
    onEdit: noop,
    onAdd: noop,
    onOpenWebsite: noop,
    onFinish: noop,
  },
} satisfies Record<string, BudgetEditorProps>;
