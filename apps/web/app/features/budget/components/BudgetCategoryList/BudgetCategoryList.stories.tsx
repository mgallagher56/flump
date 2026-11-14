import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { expect, fn, userEvent, within } from "storybook/test";
import { sampleBudgetEntries } from "../../sampleBudgetEntries";
import { BudgetCategoryList, type BudgetCategoryListProps } from "./BudgetCategoryList";

const Stateful = (args: BudgetCategoryListProps) => {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <BudgetCategoryList
      {...args}
      openCategory={open}
      onToggleCategory={(cat) => setOpen((prev) => (prev === cat ? null : cat))}
    />
  );
};

const meta: Meta<typeof BudgetCategoryList> = {
  title: "3. Patterns/Budget/BudgetCategoryList",
  component: BudgetCategoryList,
  parameters: { layout: "padded" },
  args: {
    categories: ["housing", "bills", "expenses", "savings", "income", "transport", "pets"],
    entries: sampleBudgetEntries(),
    openCategory: null,
    renderEntries: (cat: string) => <p>Entries for {cat}</p>,
    onAddCategory: fn(),
  },
  render: (args) => <Stateful {...args} />,
};

export default meta;
type Story = StoryObj<typeof BudgetCategoryList>;

// The Storybook decorator renders light and dark side by side, so queries use the first match.
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const housing = canvas.getAllByTestId("budget-category-housing")[0];
    if (!housing) throw new Error("Housing row missing");
    await userEvent.click(housing);
    await expect(housing).toHaveAttribute("aria-expanded", "true");
    await expect(canvas.getAllByText("Entries for housing")[0]).toBeDefined();
  },
};

export const FewCategories: Story = {
  args: { entries: sampleBudgetEntries().slice(0, 4), categories: ["housing", "income"] },
};
