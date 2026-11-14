import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "storybook/test";
import SavingsContainer from "./SavingsContainer";

/** Filled: £21,000 at 4%, £300 a month, £200 of it into an ISA. */
const loaderData = {
  accounts: [
    {
      id: "acc-1",
      name: "Easy access saver",
      type: "Saving",
      balance: 9000,
      interestRate: 4,
      monthlyContribution: 100,
    },
    {
      id: "acc-2",
      name: "Cash ISA",
      type: "Saving",
      balance: 12000,
      interestRate: 4,
      monthlyContribution: 200,
    },
  ],
  accountDetails: [],
  userProfile: { hasResetFinancialData: true },
};

const meta: Meta<typeof SavingsContainer> = {
  title: "6. Pages/Savings",
  component: SavingsContainer,
  parameters: { layout: "fullscreen", router: { loaderData } },
};

export default meta;
type Story = StoryObj<typeof SavingsContainer>;

// The Storybook decorator renders light and dark side by side, so queries use the first match.
export const Filled: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByRole("heading", { name: "Your savings" })[0]).toBeDefined();
    await expect(canvas.getAllByText("Total savings")[0]).toBeDefined();
    await expect(canvas.getAllByText("Your accounts")[0]).toBeDefined();
    await expect(canvas.getAllByText("Model a change to your savings")[0]).toBeDefined();
  },
};

export const TimeToATarget: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getAllByRole("tab", { name: "Time to a target" })[0]);
    await expect(canvas.getAllByLabelText("Target amount")[0]).toBeDefined();
  },
};

export const NothingSet: Story = {
  parameters: {
    router: {
      loaderData: {
        ...loaderData,
        accounts: [{ id: "acc-1", name: "Easy access saver", type: "Saving", balance: 5000 }],
      },
    },
  },
};

export const Empty: Story = {
  parameters: { router: { loaderData: { ...loaderData, accounts: [] } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText("No savings accounts yet")[0]).toBeDefined();
    await userEvent.click(canvas.getAllByRole("button", { name: "Add an account" })[0]);
    await expect(
      within(document.body).getAllByRole("dialog", { name: "Add a savings account" })[0],
    ).toBeDefined();
  },
};
