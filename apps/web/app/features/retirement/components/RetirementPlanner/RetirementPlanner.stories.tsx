import type { BuildRetirementPlanInputArgs } from "@flump/finance-engine";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "storybook/test";
import { RetirementPlanner } from "./RetirementPlanner";

const meta: Meta<typeof RetirementPlanner> = {
  title: "Features/Retirement/RetirementPlanner",
  component: RetirementPlanner,
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj<typeof RetirementPlanner>;

const planArgs: BuildRetirementPlanInputArgs = {
  plan: {
    retirementAge: 62,
    planToAge: 90,
    target: { kind: "typed", yearlyAmount: 26_000 },
    housingOverride: null,
    statePensionAge: 67,
    statePensionAnnualForecastGbp: null,
    statePensionQualifyingYears: 35,
    growthRates: { lower: 0.02, middle: 0.05, higher: 0.08 },
    inflationRate: 0.02,
    cashSavingsNominalRate: null,
    realRentGrowthRate: 0,
    excludedAccountIds: [],
  },
  birthYear: 1984,
  now: new Date("2026-11-17T12:00:00Z"),
  housingStatus: "own_outright",
  accounts: [
    {
      id: "11111111-1111-4111-8111-111111111111",
      name: "Workplace Pension",
      type: "Pension",
      balance: 95_000,
      monthlyContribution: 450,
    },
    {
      id: "22222222-2222-4222-8222-222222222222",
      name: "Stocks ISA",
      type: "ISA",
      balance: 30_000,
      monthlyContribution: 200,
    },
  ],
  budgetEntries: [
    {
      id: "33333333-3333-4333-8333-333333333333",
      category: "essentials",
      name: "Groceries and bills",
      amount: 850,
      frequency: "monthly",
      isIncome: false,
      isEssential: true,
    },
  ],
};

const baseArgs = {
  planArgs,
  accountDetails: [
    { accountId: "11111111-1111-4111-8111-111111111111", year: 2026, month: 10, value: 94_000 },
    { accountId: "11111111-1111-4111-8111-111111111111", year: 2026, month: 11, value: 95_000 },
  ],
  etag: '"2026-11-16T10:00:00.000Z"',
};

export const Light: Story = {
  args: baseArgs,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Retirement plan")).toBeInTheDocument();
    // The scenario zone starts closed below the saved figures.
    const toggle = canvas.getByRole("button", { name: "Show what-if: change your plan" });
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(toggle);
    await expect(canvas.getByText("From State Pension age (67)")).toBeInTheDocument();
    await userEvent.click(canvas.getByRole("button", { name: "Higher case (8%)" }));
    await expect(
      canvas.getByRole("button", { name: "Reset to saved figures" }),
    ).toBeInTheDocument();
  },
};

export const Dark: Story = {
  args: baseArgs,
  parameters: {
    themes: { themeOverride: "dark" },
  },
};

export const MissingDetails: Story = {
  args: {
    ...baseArgs,
    planArgs: {
      ...planArgs,
      plan: { ...planArgs.plan, retirementAge: null, planToAge: null, statePensionAge: null },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText("To see an estimate, add your retirement age and the age to plan to."),
    ).toBeInTheDocument();
  },
};

const workplaceArgs = {
  ...baseArgs,
  planArgs: {
    ...planArgs,
    workplacePension: {
      annualSalary: 48_000,
      employeePercent: 6,
      employerPercent: 4,
      isSalarySacrifice: true,
      passEmployerNi: true,
    },
  },
};

export const WorkplacePension: Story = {
  args: workplaceArgs,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // The what-if zone starts closed; its content mounts once opened.
    await userEvent.click(canvas.getByRole("button", { name: "Show what-if: change your plan" }));
    await expect(canvas.getByDisplayValue("6")).toBeInTheDocument();
    await expect(canvas.getByRole("figure", { name: "Pot each year" })).toBeInTheDocument();
    await userEvent.click(
      canvas.getByLabelText("Base contributions on pay that counts for your pension"),
    );
    await expect(canvas.getByText(/Change from your saved plan/)).toBeInTheDocument();
    await expect(
      canvas.getByRole("link", { name: /Pension guidance from MoneyHelper/ }),
    ).toBeInTheDocument();
  },
};

export const WorkplacePensionDark: Story = {
  args: workplaceArgs,
  parameters: {
    themes: { themeOverride: "dark" },
  },
};

/** Rates never answered: the drawer says they are not set and not included. */
export const WorkplacePensionRatesNotSet: Story = {
  args: {
    ...baseArgs,
    planArgs: {
      ...planArgs,
      workplacePension: {
        annualSalary: 48_000,
        employeePercent: 0,
        employerPercent: 0,
        notSet: ["pensionPercent", "pensionEmployerPercent"],
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Show what-if: change your plan" }));
    await userEvent.click(
      canvas.getByRole("button", { name: /Assumptions, pots and year by year/ }),
    );
    await expect(canvas.getByText(/are not set, so they are not included/)).toBeInTheDocument();
    await userEvent.click(
      canvas.getByLabelText("Base contributions on pay that counts for your pension"),
    );
    await expect(canvas.queryByText("Edited. Not saved.")).toBeNull();
  },
};

/** A rate saved with no salary: the drawer says the contributions are not included (leftovers 1). */
export const WorkplaceSalaryNotSet: Story = {
  args: {
    ...baseArgs,
    planArgs: { ...planArgs, workplacePension: null },
    workplaceSalaryNotSet: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Show what-if: change your plan" }));
    await userEvent.click(
      canvas.getByRole("button", { name: /Assumptions, pots and year by year/ }),
    );
    await expect(
      canvas.getByText(/your salary is not set, so your contributions are not included/),
    ).toBeInTheDocument();
    await expect(
      canvas.getByRole("link", { name: "Add your salary on the Pension page" }),
    ).toBeInTheDocument();
  },
};
