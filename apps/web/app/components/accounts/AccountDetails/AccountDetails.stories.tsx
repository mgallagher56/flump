import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "storybook/test";
import AccountDetails from "./AccountDetails";

const meta: Meta<typeof AccountDetails> = {
  title: "3. Patterns/Accounts/AccountDetails",
  component: AccountDetails,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof AccountDetails>;

const mockLoaderData = {
  account: { id: "acc-1", name: "Main Savings", type: "Saving" },
  accountDetails: [
    { id: 1, account_id: "acc-1", month: 1, year: 2026, value: 5000 },
    { id: 2, account_id: "acc-1", month: 2, year: 2026, value: 5100 },
    { id: 3, account_id: "acc-1", month: 3, year: 2026, value: 5300 },
  ],
};

const twelveMonths = {
  account: { id: "acc-1", name: "Main Savings", type: "Saving" },
  accountDetails: Array.from({ length: 12 }, (_, i) => ({
    id: i + 1,
    account_id: "acc-1",
    month: i + 1,
    year: 2025,
    value: 5000 + i * 120,
  })),
};

export const LedgerWithDrawer: Story = {
  parameters: {
    router: { loaderData: twelveMonths },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("tab", { name: "Month by month" }));
    const drawer = await canvas.findByRole("button", { name: /Show earlier months/ });
    await userEvent.click(drawer);
    await expect(canvas.getByRole("table", { name: "Earlier monthly balances" })).toBeDefined();
  },
};

export const ViewMode: Story = {
  parameters: {
    // E8 waiver: color-contrast
    a11y: { config: { rules: [{ id: "color-contrast", enabled: false }] } },
    router: {
      loaderData: mockLoaderData,
    },
  },
};
