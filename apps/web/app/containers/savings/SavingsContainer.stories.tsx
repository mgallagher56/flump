import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "storybook/test";
import SavingsContainer from "./SavingsContainer";

const loaderData = {
  accounts: [
    {
      id: "acc-1",
      name: "Marcus easy access",
      type: "Saving",
      balance: 12400,
      interestRate: 4.5,
      monthlyContribution: 250,
    },
    {
      id: "acc-2",
      name: "Vanguard stocks and shares ISA",
      type: "Investment",
      balance: 18650,
      interestRate: 6.5,
      monthlyContribution: 300,
    },
    {
      id: "acc-3",
      name: "Emergency fund",
      type: "Saving",
      balance: 6200,
      interestRate: 4.1,
      monthlyContribution: 100,
    },
  ],
  accountDetails: [],
  userProfile: {
    hasResetFinancialData: true,
    monthlyTakeHome: 3400,
    savingsDefaultInterestRate: 4.5,
  },
};

const meta: Meta<typeof SavingsContainer> = {
  title: "Screens/Savings",
  component: SavingsContainer,
  parameters: { layout: "fullscreen", router: { loaderData } },
};

export default meta;
type Story = StoryObj<typeof SavingsContainer>;

const openAccounts = async (canvasElement: HTMLElement) => {
  const canvas = within(canvasElement);
  await userEvent.click(canvas.getAllByRole("tab", { name: /Accounts/ })[0]);
  return canvas;
};

// The Storybook decorator renders light and dark side by side, so queries use the first match.
export const Overview: Story = {
  play: async ({ canvasElement }) => {
    const canvas = await openAccounts(canvasElement);
    await expect(canvas.getAllByRole("heading", { name: "Your savings" })[0]).toBeDefined();
    await expect(canvas.getAllByText("Where you stand")[0]).toBeDefined();
    await expect(canvas.getAllByText("Your accounts")[0]).toBeDefined();
  },
};

export const Forecast: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText("Savings projection")[0]).toBeDefined();
    await expect(canvas.getAllByText("Forecast settings")[0]).toBeDefined();
  },
};

export const AddAccountDialog: Story = {
  play: async ({ canvasElement }) => {
    const canvas = await openAccounts(canvasElement);
    await userEvent.click(canvas.getAllByRole("button", { name: "Add account" })[0]);
    await expect(
      within(document.body).getAllByRole("dialog", { name: "Add a savings account" })[0],
    ).toBeDefined();
  },
};

export const Empty: Story = {
  parameters: { router: { loaderData: { ...loaderData, accounts: [] } } },
  play: async ({ canvasElement }) => {
    const canvas = await openAccounts(canvasElement);
    await expect(canvas.getAllByText("No savings accounts yet")[0]).toBeDefined();
  },
};
