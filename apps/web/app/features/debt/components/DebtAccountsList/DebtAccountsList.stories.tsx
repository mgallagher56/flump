import type { DebtItem } from "@flump/finance-engine";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { DebtAccountsList } from "./DebtAccountsList";

const debts: DebtItem[] = [
  {
    id: "d1",
    name: "Everyday credit card",
    type: "credit_card",
    balance: 3000,
    apr: 22.9,
    minimumPayment: 90,
  },
  {
    id: "d2",
    name: "Car loan",
    type: "loan",
    balance: 4500,
    apr: 0,
    aprKnown: false,
    minimumPayment: 120,
    minimumPaymentEstimated: true,
  },
];

const meta: Meta<typeof DebtAccountsList> = {
  title: "3. Patterns/Debt/DebtAccountsList",
  component: DebtAccountsList,
  parameters: { layout: "padded" },
  args: { debts, onDeleteDebt: fn(), onUpdateDebt: fn() },
};

export default meta;
type Story = StoryObj<typeof DebtAccountsList>;

// The Storybook decorator renders light and dark side by side, so queries use the "all" variants.
/** Shows "Rate not added"; delete is reached through the row's one Edit control. */
export const WithUnknownApr: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);
    await expect(canvas.queryAllByText("Not set").length).toBe(0);
    await expect(canvas.getAllByText("Rate not added").length).toBeGreaterThan(0);
    await expect(canvas.queryAllByRole("button", { name: /^Delete/ }).length).toBe(0);
    await userEvent.click(
      canvas.getAllByRole("button", { name: "Edit Car loan" })[0] as HTMLElement,
    );
    await userEvent.click(await body.findByRole("button", { name: "Delete debt" }));
    await expect(args.onDeleteDebt).toHaveBeenCalledWith("d2");
  },
};

export const Empty: Story = {
  args: { debts: [] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText("No debts added").length).toBeGreaterThan(0);
  },
};
