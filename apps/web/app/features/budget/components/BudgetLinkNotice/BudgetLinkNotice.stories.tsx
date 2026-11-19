import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { BudgetLinkNotice } from "./BudgetLinkNotice";

const meta: Meta<typeof BudgetLinkNotice> = {
  title: "3. Patterns/Budget/BudgetLinkNotice",
  component: BudgetLinkNotice,
  parameters: { layout: "padded" },
  args: {
    offers: [
      { link: "take_home", monthly: 2453.3, kind: null, paymentEstimated: false, rowIds: ["cb"] },
      { link: "housing", monthly: 1200, kind: "rent", paymentEstimated: false, rowIds: ["hi"] },
    ],
    onAdd: fn(async () => undefined),
    onChooseEntry: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof BudgetLinkNotice>;

// The Storybook decorator renders light and dark side by side, so queries use the first match.
export const Default: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const note = canvas.getAllByRole("note")[0];
    if (!note) throw new Error("Note missing");
    await expect(note).toHaveTextContent("Your rent of £1,200 from your housing details");
    const add = canvas.getAllByRole("button", { name: "Add your rent of £1,200" })[0];
    if (!add) throw new Error("Add button missing");
    await userEvent.click(add);
    await expect(args.onAdd).toHaveBeenCalled();
    const choose = canvas.getAllByRole("button", {
      name: "Replace one of your entries instead",
    })[0];
    if (!choose) throw new Error("Choose button missing");
    await userEvent.click(choose);
    await expect(args.onChooseEntry).toHaveBeenCalled();
  },
};

/** The mortgage accounts' estimate, inside the editor (no choose button). */
export const MortgageEstimateInEditor: Story = {
  args: {
    offers: [
      {
        link: "housing",
        monthly: 1234.56,
        kind: "mortgage",
        paymentEstimated: true,
        rowIds: ["m"],
      },
    ],
    onChooseEntry: undefined,
  },
};
