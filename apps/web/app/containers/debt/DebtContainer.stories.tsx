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

// The Storybook decorator renders every story in light and dark side by side, so queries use the
// "all" variants.
export const Populated: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect((await canvas.findAllByText("Debt-free date")).length).toBeGreaterThan(0);
    await expect(canvas.getAllByText("Total you owe").length).toBeGreaterThan(0);
    await expect(canvas.queryAllByText("Not set").length).toBe(0);
    await expect(
      canvas.getAllByRole("complementary", { name: "Debt advice" }).length,
    ).toBeGreaterThan(0);
  },
};

export const AprNotSet: Story = {
  parameters: {
    router: { loaderData: loaderData([{ ...debts[0], interestRate: null }, debts[1]]) },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      (await canvas.findAllByText("Add the rate for 1 debt to see your debt-free date")).length,
    ).toBeGreaterThan(0);
    await expect(canvas.queryAllByText("Not set").length).toBe(0);
  },
};

/** No debts: the h1, a short intro, one Add button and the MoneyHelper line. */
export const Empty: Story = {
  parameters: { router: { loaderData: loaderData([]) } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      (await canvas.findAllByRole("button", { name: "Add a debt" })).length,
    ).toBeGreaterThan(0);
    await expect(canvas.queryAllByRole("tab").length).toBe(0);
    await expect(
      canvas.getAllByRole("complementary", { name: "Debt advice" }).length,
    ).toBeGreaterThan(0);
  },
};

/** The scenario zone is an illustration: moving its slider never changes the hero or strip. */
export const Scenario: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const zones = await canvas.findAllByRole("region", { name: "Model a change to your debts" });
    await expect(zones.length).toBeGreaterThan(0);
    await expect(canvas.getAllByText("Illustration, not saved").length).toBeGreaterThan(0);
    const hero = canvasElement.querySelector("[data-tone='hero']") as HTMLElement;
    const saved = hero.parentElement as HTMLElement;
    const before = saved.textContent;
    const slider = canvas.getAllByRole("slider", { name: /Extra payment each month/i })[0];
    await fireEvent.change(slider as HTMLInputElement, { target: { value: "300" } });
    await expect(
      canvas.getAllByRole("button", { name: "Reset to saved figures" }).length,
    ).toBeGreaterThan(0);
    await expect(saved.textContent).toBe(before);
  },
};
