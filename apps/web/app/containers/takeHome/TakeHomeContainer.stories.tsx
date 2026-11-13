import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import TakeHomeContainer from "./TakeHomeContainer";

const loaderData = {
  userProfile: { annualSalary: 62000, hasResetFinancialData: true },
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
    await expect(canvas.getAllByRole("heading", { name: "Your take-home pay" })[0]).toBeDefined();
    await expect(canvas.getAllByText("Where you stand")[0]).toBeDefined();
    await expect(canvas.getAllByText("Where your salary goes")[0]).toBeDefined();
  },
};
