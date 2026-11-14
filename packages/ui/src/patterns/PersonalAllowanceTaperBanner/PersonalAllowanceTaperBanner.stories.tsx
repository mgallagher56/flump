import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { PersonalAllowanceTaperBanner } from "./PersonalAllowanceTaperBanner";

const meta: Meta<typeof PersonalAllowanceTaperBanner> = {
  title: "3. Patterns/PersonalAllowanceTaperBanner",
  component: PersonalAllowanceTaperBanner,
  parameters: {
    layout: "padded",
  },
  args: {
    grossIncome: 112000,
  },
};

export default meta;
type Story = StoryObj<typeof PersonalAllowanceTaperBanner>;

export const InTaperBand: Story = {
  args: {
    grossIncome: 115000,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Income in the £100,000 to £125,140 band")).toBeInTheDocument();
  },
};

export const BelowTaperBand: Story = {
  args: {
    grossIncome: 98000,
  },
};

export const AboveTaperBand: Story = {
  args: {
    grossIncome: 140000,
  },
};
