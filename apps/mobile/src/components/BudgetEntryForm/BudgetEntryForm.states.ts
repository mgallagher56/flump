import type { BudgetEntryFormProps } from "./BudgetEntryForm";

const noop = () => undefined;
const CATEGORIES = ["income", "housing", "expenses", "bills", "savings"];

/** Named prop sets for the dev gallery and the tests (in place of Storybook stories). */
export const budgetEntryFormStates = {
  add: {
    mode: "add",
    initial: { name: "", amount: null, frequency: "monthly", category: "bills", isEssential: true },
    categories: CATEGORIES,
    onSave: noop,
    onCancel: noop,
  },
  edit: {
    mode: "edit",
    initial: {
      name: "Energy",
      amount: 80,
      frequency: "monthly",
      category: "bills",
      isEssential: true,
    },
    categories: CATEGORIES,
    onSave: noop,
    onCancel: noop,
    onDelete: noop,
  },
  income: {
    mode: "add",
    initial: {
      name: "",
      amount: null,
      frequency: "monthly",
      category: "income",
      isEssential: true,
    },
    categories: CATEGORIES,
    onSave: noop,
    onCancel: noop,
  },
  failed: {
    mode: "edit",
    initial: {
      name: "Energy",
      amount: 80,
      frequency: "monthly",
      category: "bills",
      isEssential: true,
    },
    categories: CATEGORIES,
    error: "We could not save your changes. Nothing has changed. Try again.",
    onSave: noop,
    onCancel: noop,
    onDelete: noop,
  },
  saving: {
    mode: "edit",
    initial: {
      name: "Energy",
      amount: 80,
      frequency: "monthly",
      category: "bills",
      isEssential: true,
    },
    categories: CATEGORIES,
    saving: true,
    onSave: noop,
    onCancel: noop,
    onDelete: noop,
  },
} satisfies Record<string, BudgetEntryFormProps>;
