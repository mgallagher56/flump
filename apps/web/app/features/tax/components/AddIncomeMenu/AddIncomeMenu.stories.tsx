import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { AddIncomeMenu } from "./AddIncomeMenu";

/** The Storybook preview renders every story side by side in light and dark. */
const meta: Meta<typeof AddIncomeMenu> = {
  title: "3. Patterns/Tax/AddIncomeMenu",
  component: AddIncomeMenu,
  tags: ["autodocs"],
  args: { onAdd: fn(), onCopyFromLastYear: fn() },
};

export default meta;
type Story = StoryObj<typeof AddIncomeMenu>;

export const Closed: Story = {};

export const Open: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Add income" }));
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.click(await body.findByRole("menuitem", { name: "Self-employed income" }));
    await expect(args.onAdd).toHaveBeenCalledWith("self-employed", "income");
  },
};
