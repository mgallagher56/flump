import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { DebtSnowballCalculator } from "./DebtSnowballCalculator";

const meta: Meta<typeof DebtSnowballCalculator> = {
  title: "3. Calculators/DebtSnowballCalculator",
  component: DebtSnowballCalculator,
};

export default meta;
type Story = StoryObj<typeof DebtSnowballCalculator>;

const play: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const card = canvas.getByRole("group", { name: /Credit card/ });
  await expect(within(card).getByLabelText("Balance (£)")).toBeInTheDocument();
  await expect(canvas.getByText(/Debt free:/)).toBeInTheDocument();
};

export const Default: Story = { play };

export const Light: Story = { globals: { theme: "light" }, play };

export const Dark: Story = { globals: { theme: "dark" }, play };

/** Phone width: the liability fields stack, so nothing scrolls sideways (pre-release defect 10). */
export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: "mobile1" } },
  play: async (context) => {
    await play(context);
    const tool = within(context.canvasElement).getByTestId("debt-snowball-tool");
    await expect(tool.scrollWidth).toBeLessThanOrEqual(tool.clientWidth);
  },
};

export const MobileDark: Story = { ...Mobile, globals: { theme: "dark" } };
