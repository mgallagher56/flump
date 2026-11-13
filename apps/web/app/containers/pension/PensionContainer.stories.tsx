import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import PensionContainer from "./PensionContainer";

const accounts = [
  {
    id: "p1",
    name: "Current Workplace Pot",
    type: "Pension",
    balance: 10000,
    interestRate: 6,
    monthlyContribution: 100,
    isCurrent: true,
  },
  {
    id: "p2",
    name: "Old Employer Pot",
    type: "Pension",
    balance: 20000,
    interestRate: 5,
    monthlyContribution: 50,
    isCurrent: false,
  },
];

const loaderData = (acc: unknown[], userProfile: Record<string, unknown>) => ({
  accounts: acc,
  accountDetails: [],
  userProfile: { setupChecklistCompletedSteps: ["pension"], ...userProfile },
});

const salaried = {
  annualSalary: 50000,
  pensionPercent: 6,
  pensionEmployerPercent: 4,
  isSalarySacrifice: true,
  isSalarySacrificeEmployerNi: false,
  employmentType: "employed",
};

// The Storybook react-router mock serves `parameters.router.loaderData` to useLoaderData.
const meta: Meta<typeof PensionContainer> = {
  title: "4. Pages/Pension",
  component: PensionContainer,
  parameters: { layout: "padded", router: { loaderData: loaderData(accounts, salaried) } },
};

export default meta;
type Story = StoryObj<typeof PensionContainer>;

export const Populated: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect((await canvas.findAllByText("Total in your pots")).length).toBeGreaterThan(0);
    await expect(canvasElement.querySelectorAll("[data-tone='hero']").length).toBeGreaterThan(0);
  },
};

export const NoSalaryOrPots: Story = {
  parameters: { router: { loaderData: loaderData([], { annualSalary: null }) } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect((await canvas.findAllByText("No pots yet")).length).toBeGreaterThan(0);
    await expect(canvasElement.querySelectorAll("[data-tone='hero']").length).toBe(0);
  },
};

export const TaxTrap: Story = {
  parameters: {
    router: {
      loaderData: loaderData(accounts, { ...salaried, annualSalary: 110000, pensionPercent: 0 }),
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      (await canvas.findAllByRole("button", { name: "Model this contribution" })).length,
    ).toBeGreaterThan(0);
  },
};
