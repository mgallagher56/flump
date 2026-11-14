import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import TakeHomeContainer from "./TakeHomeContainer";

const loaderData = {
  userProfile: {
    annualSalary: 62000,
    employmentType: "employed",
    taxRegion: "ENGLAND",
    pensionPercent: 5,
    isSalarySacrifice: false,
    studentLoanPlans: [],
    hasResetFinancialData: true,
  },
};

const meta: Meta<typeof TakeHomeContainer> = {
  title: "Screens/Take-home",
  component: TakeHomeContainer,
  parameters: { layout: "fullscreen", router: { loaderData } },
};

export default meta;
type Story = StoryObj<typeof TakeHomeContainer>;

// The Storybook decorator renders light and dark side by side, so queries use the first match.
export const Overview: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByRole("heading", { name: "Take-home pay" })[0]).toBeDefined();
    await expect(canvas.getAllByText("Where your pay goes")[0]).toBeDefined();
    await expect(canvas.getAllByRole("tab", { name: "A pay rise" })[0]).toBeDefined();
  },
};

export const NoSalary: Story = {
  parameters: {
    router: { loaderData: { userProfile: { ...loaderData.userProfile, annualSalary: null } } },
  },
};
