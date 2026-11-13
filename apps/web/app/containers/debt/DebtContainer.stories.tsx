import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import DebtContainer from "./DebtContainer";

const debts = [
  {
    id: "acc-cc",
    name: "Barclaycard Platinum",
    type: "Credit Card",
    balance: 3000,
    interestRate: 22.9,
    monthlyContribution: 90,
    monthlyContributionKnown: true,
  },
  {
    id: "acc-loan",
    name: "Tesco Loan",
    type: "Loan",
    balance: 4500,
    interestRate: 7.9,
    monthlyContribution: 150,
    monthlyContributionKnown: true,
  },
];

const loaderData = (accounts: unknown[]) => ({
  accounts,
  accountDetails: [],
  debtInputs: { monthlySurplus: 400, liquidSavings: 2500, monthlyEssentialExpenses: 1600 },
  userProfile: {},
});

// The Storybook react-router mock serves `parameters.router.loaderData` to useLoaderData.
const meta: Meta<typeof DebtContainer> = {
  title: "4. Pages/Debt",
  component: DebtContainer,
  parameters: { layout: "padded", router: { loaderData: loaderData(debts) } },
};

export default meta;
type Story = StoryObj<typeof DebtContainer>;

export const Populated: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect((await canvas.findAllByText("Debt-free by")).length).toBeGreaterThan(0);
    const hero = canvasElement.querySelectorAll("[data-tone='hero']");
    await expect(hero.length).toBeGreaterThan(0);
  },
};

export const AprNotSet: Story = {
  parameters: {
    router: { loaderData: loaderData([{ ...debts[0], interestRate: null }, debts[1]]) },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect((await canvas.findAllByText("Not calculated")).length).toBeGreaterThan(0);
    await expect(canvasElement.querySelectorAll("[data-tone='hero']").length).toBe(0);
  },
};

export const Empty: Story = {
  parameters: { router: { loaderData: loaderData([]) } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect((await canvas.findAllByText("No debts yet")).length).toBeGreaterThan(0);
  },
};
