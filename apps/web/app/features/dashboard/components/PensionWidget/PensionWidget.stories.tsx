import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { PensionWidget } from "./PensionWidget";

const meta: Meta<typeof PensionWidget> = {
  title: "3. Financial Patterns & Sections/PensionWidget",
  component: PensionWidget,
  parameters: { layout: "padded" },
  args: {
    data: {
      totalPensionBalance: 30000,
      potsCount: 1,
      employeePercent: 6,
      employerPercent: 4,
      isSalarySacrifice: false,
      monthlyContributionEst: 250,
    },
    targetRetirementAge: 60,
  },
};

export default meta;
type Story = StoryObj<typeof PensionWidget>;

// The Storybook decorator renders light and dark side by side, so queries use the first match.
export const CustomRates: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getAllByText("10% total contribution")[0]).toBeDefined();
  },
};

/** The backend default 5% + 3% pair is labelled as a default the user may not have chosen. */
export const DefaultRatesLabelled: Story = {
  args: {
    data: {
      totalPensionBalance: 30000,
      potsCount: 1,
      employeePercent: 5,
      employerPercent: 3,
      isSalarySacrifice: true,
      monthlyContributionEst: 200,
    },
  },
};

/** Rates and retirement age unknown: "Not set" with a link, never a default. */
export const NotSet: Story = {
  args: {
    data: {
      totalPensionBalance: 30000,
      potsCount: 1,
      employeePercent: null,
      employerPercent: null,
      isSalarySacrifice: null,
      monthlyContributionEst: null,
    },
    targetRetirementAge: null,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText("Not set").length).toBeGreaterThan(0);
    await expect(canvas.getAllByRole("link", { name: "Add contribution rates" })[0]).toBeDefined();
    await expect(canvas.getAllByRole("link", { name: "Add retirement age" })[0]).toBeDefined();
  },
};
