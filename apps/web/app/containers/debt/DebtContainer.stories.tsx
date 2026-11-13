import type { Meta, StoryObj } from "@storybook/react";
import { expect, fireEvent, within } from "storybook/test";
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
    await expect(canvas.getAllByText("Paying the minimums only").length).toBeGreaterThan(0);
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
    await expect((await canvas.findAllByText("Not set")).length).toBeGreaterThan(0);
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

/** The scenario zone is an illustration: moving its slider never changes the saved KPI strip. */
export const Scenario: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const zones = await canvas.findAllByRole("region", { name: "Model a change to your debts" });
    await expect(zones.length).toBeGreaterThan(0);
    await expect(canvas.getAllByText("Illustration, not saved").length).toBeGreaterThan(0);
    const hero = canvasElement.querySelector("[data-tone='hero']");
    const strip = hero?.parentElement as HTMLElement;
    const before = strip.textContent;
    const slider = canvas.getAllByRole("slider", { name: /Extra payment each month/i })[0];
    await fireEvent.change(slider as HTMLInputElement, { target: { value: "300" } });
    await expect(
      canvas.getAllByRole("button", { name: "Reset to saved figures" }).length,
    ).toBeGreaterThan(0);
    await expect(strip.textContent).toBe(before);
  },
};
