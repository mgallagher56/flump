import type { Meta, StoryObj } from "@storybook/react";
import { expect, fireEvent, userEvent, within } from "storybook/test";
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
    await expect(
      (await canvas.findAllByText("Add a pension pot to see its value")).length,
    ).toBeGreaterThan(0);
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
    // E31: the taper note follows the main content rather than leading the page.
    const note = canvasElement.querySelector('[aria-labelledby="pension-trap-title"]');
    const tabs = canvas.getByRole("tablist", { name: "Pension tools" });
    await expect(
      Boolean(note && tabs.compareDocumentPosition(note) & Node.DOCUMENT_POSITION_FOLLOWING),
    ).toBe(true);
  },
};

// E31: adjusted net income outside £90,000 to £125,140 shows no taper note.
export const TaxTrapAboveBand: Story = {
  parameters: {
    router: {
      loaderData: loaderData(accounts, { ...salaried, annualSalary: 140000, pensionPercent: 0 }),
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect((await canvas.findAllByText("Total in your pots")).length).toBeGreaterThan(0);
    await expect(canvasElement.querySelector('[aria-labelledby="pension-trap-title"]')).toBeNull();
  },
};

export const ScenarioZone: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const zone = await canvas.findByRole("region", { name: "Model a change to your pension" });
    await expect(within(zone).getByText("Illustration, not saved")).toBeDefined();
    await expect(zone.querySelectorAll("[data-tone='hero']").length).toBe(0);
    const heroBefore = canvasElement.querySelector("[data-tone='hero']")?.textContent;
    fireEvent.change(within(zone).getByLabelText("Extra each month range slider"), {
      target: { value: "300" },
    });
    await userEvent.click(
      await within(zone).findByRole("button", { name: "Reset to saved figures" }),
    );
    await expect(canvasElement.querySelector("[data-tone='hero']")?.textContent).toBe(heroBefore);
    await expect(canvas.queryByText(/sync/i)).toBeNull();
  },
};
