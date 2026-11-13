import type { DebtItem } from "@flump/finance-engine";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "storybook/test";
import { DebtToWealthBridgeCard } from "./DebtToWealthBridgeCard";

const debts: DebtItem[] = [
  { id: "d1", name: "Barclaycard Platinum", balance: 3000, apr: 22.9, minimumPayment: 90 },
  { id: "d2", name: "Tesco Loan", balance: 4500, apr: 7.9, minimumPayment: 150 },
];

const meta: Meta<typeof DebtToWealthBridgeCard> = {
  title: "3. Financial Patterns & Sections/DebtToWealthBridgeCard",
  component: DebtToWealthBridgeCard,
  parameters: { layout: "padded" },
  args: { debts, extraPayment: 100 },
};

export default meta;
type Story = StoryObj<typeof DebtToWealthBridgeCard>;

// The Storybook decorator renders light and dark side by side, so queries use the "all" variants.
export const Populated: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getAllByText(/What if the money that clears your debts/).length,
    ).toBeGreaterThan(0);
    await expect(canvas.getAllByText(/Assumes 4.5% a year/).length).toBeGreaterThan(0);
  },
};

export const ChangeGrowthRate: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const select = canvas.getAllByLabelText("Assumed growth a year")[0] as HTMLSelectElement;
    await userEvent.selectOptions(select, "7.5");
    await expect(canvas.getAllByText(/Assumes 7.5% a year/).length).toBeGreaterThan(0);
  },
};

export const NotCleared: Story = {
  args: {
    debts: [{ id: "d1", name: "Card", balance: 5000, apr: 40, minimumPayment: 1 }],
    extraPayment: 0,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText("Not cleared within the projection").length).toBeGreaterThan(
      0,
    );
  },
};
