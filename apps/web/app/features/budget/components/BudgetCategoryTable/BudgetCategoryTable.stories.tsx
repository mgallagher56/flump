import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import type { BudgetEntry } from "~/types/budget";
import { BudgetCategoryTable } from "./BudgetCategoryTable";

const bill = (n: number, over: Partial<BudgetEntry> = {}): BudgetEntry => ({
  id: `b${n}`,
  userId: "u",
  category: "bills",
  name: `Bill ${n}`,
  amount: 20 + n * 7,
  frequency: "monthly",
  isEssential: n % 2 === 0,
  isIncome: false,
  isPrimaryIncome: false,
  isDefault: false,
  notes: null,
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
  ...over,
});

const meta: Meta<typeof BudgetCategoryTable> = {
  title: "3. Financial Patterns & Sections/Budget/BudgetCategoryTable",
  component: BudgetCategoryTable,
  parameters: { layout: "padded" },
  args: {
    category: "bills",
    entries: [
      bill(1, { name: "Energy", amount: 130 }),
      bill(2, { name: "Broadband", amount: 360, frequency: "annual", notes: "Fixed until spring" }),
      bill(3, { name: "Mobile", amount: 18 }),
    ],
    onAdd: fn().mockResolvedValue(undefined),
    onUpdate: fn().mockResolvedValue(undefined),
    onDelete: fn().mockResolvedValue(undefined),
  },
};

export default meta;
type Story = StoryObj<typeof BudgetCategoryTable>;

// The Storybook decorator renders light and dark side by side, so queries use the first match.
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const add = within(canvasElement).getAllByRole("button", { name: "Add entry" })[0];
    if (!add) throw new Error("Add entry missing");
    await userEvent.click(add);
    await expect(within(document.body).getByRole("dialog", { name: "Add to bills" })).toBeDefined();
  },
};

export const Empty: Story = { args: { entries: [] } };

export const ManyRows: Story = {
  args: { entries: Array.from({ length: 12 }, (_, i) => bill(i + 1)) },
};
