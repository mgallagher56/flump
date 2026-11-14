import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { TakeHomeDeltaPanel } from "./TakeHomeDeltaPanel";

const meta: Meta<typeof TakeHomeDeltaPanel> = {
  title: "3. Patterns/TakeHomeDeltaPanel",
  component: TakeHomeDeltaPanel,
  parameters: { layout: "padded" },
  args: {
    deltaGross: 1000,
    takeHome: 720,
    components: { incomeTax: 200, nationalInsurance: 80, studentLoan: 0, hicbc: 0, pension: 0 },
    ratesYear: "2026/27",
    calendarYear: "2026/27",
    isFallback: false,
    isUnverifiedEstimate: false,
    assumptions: [
      { code: "annualMethod", unverified: false },
      { code: "regionAssumed", unverified: false },
    ],
  },
};

export default meta;
type Story = StoryObj<typeof TakeHomeDeltaPanel>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const table = within(canvas.getByRole("table"));
    // No take-home row: the headline card shows it. The table lists the deductions.
    await expect(table.queryByText("£720")).not.toBeInTheDocument();
    await expect(table.getByText("£200")).toBeInTheDocument();
    await expect(canvas.getByText("As at tax year 2026/27")).toBeInTheDocument();
  },
};

export const UnverifiedWithChildBenefit: Story = {
  args: {
    takeHome: 225,
    components: { incomeTax: 400, nationalInsurance: 20, studentLoan: 90, hicbc: 265, pension: 0 },
    isUnverifiedEstimate: true,
    assumptions: [
      { code: "annualMethod", unverified: false },
      { code: "childBenefitWeeks", unverified: true },
      { code: "hicbcIndividualBasis", unverified: false },
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // The notice leads with the full unverified sentence; no badge repeats it.
    await expect(
      canvas.getByText(/These tax figures have not yet been checked/),
    ).toBeInTheDocument();
    // The working sits in a closed quiet drawer.
    await userEvent.click(canvas.getByRole("button", { name: "How this is worked out" }));
    await expect(canvas.getByText("(not yet confirmed)")).toBeInTheDocument();
    // One notice: the unverified sentence leads the guidance note (E16 P4.1, P4.3).
    const notices = canvasElement.querySelectorAll("[data-notice]");
    await expect(notices).toHaveLength(1);
    await expect(notices[0]?.textContent).toMatch(/^Unverified estimate\. These tax figures/);
  },
};

export const WithPensionPreview: Story = {
  args: { pensionPreview: { contribution: 1000, takeHomeChange: 720, reachesPension: 1000 } },
};

/** The pay rise tool: no heading or badges, and the table in a closed quiet drawer. */
export const CollapsedTable: Story = {
  args: { collapseTable: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const name = "Where the next £1,000 goes";
    await expect(canvas.queryByRole("table", { name })).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole("button", { name }));
    await expect(canvas.getByRole("table", { name })).toBeInTheDocument();
  },
};

export const DarkCollapsedTable: Story = { ...CollapsedTable, globals: { theme: "dark" } };

export const OlderRates: Story = {
  args: { isFallback: true, calendarYear: "2027/28" },
};

export const Dark: Story = { ...Default, globals: { theme: "dark" } };

export const DarkUnverified: Story = { ...UnverifiedWithChildBenefit, globals: { theme: "dark" } };
