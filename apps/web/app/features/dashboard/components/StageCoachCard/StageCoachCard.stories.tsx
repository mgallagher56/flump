import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { StageCoachCard } from "./StageCoachCard";

const meta: Meta<typeof StageCoachCard> = {
  title: "3. Financial Patterns & Sections/StageCoachCard",
  component: StageCoachCard,
  parameters: { layout: "padded" },
  args: { unsecuredDebt: 8000, debtFreeDate: "March 2029", weeklyAllowance: 120 },
};

export default meta;
type Story = StoryObj<typeof StageCoachCard>;

// The Storybook decorator renders light and dark side by side, so queries use the first match.
export const WithAllowance: Story = {
  play: async ({ canvasElement }) => {
    const link = within(canvasElement).getAllByRole("link", { name: "Open debt payoff" })[0];
    await expect(link?.getAttribute("href")).toBe("/app/debt");
  },
};

export const NoBudget: Story = {
  args: { debtFreeDate: null, weeklyAllowance: null },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getAllByRole("link", { name: /Add your budget/ })[0],
    ).toBeDefined();
  },
};
