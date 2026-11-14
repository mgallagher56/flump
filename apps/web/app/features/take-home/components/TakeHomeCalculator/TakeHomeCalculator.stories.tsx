import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { TakeHomeCalculator } from "./TakeHomeCalculator";

const meta: Meta<typeof TakeHomeCalculator> = {
  title: "3. Financial Patterns & Sections/Take-home/TakeHomeCalculator",
  component: TakeHomeCalculator,
  parameters: { layout: "padded" },
  args: { initialSalary: 62000, onApplyIncrease: fn() },
};

export default meta;
type Story = StoryObj<typeof TakeHomeCalculator>;

// The Storybook decorator renders light and dark side by side, so queries use the first match.
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText("Where you stand")[0]).toBeDefined();
    const sacrifice = canvas.getAllByRole("switch", { name: /Salary sacrifice/ })[0];
    if (!sacrifice) throw new Error("Switch missing");
    // Net pay unless the user saved salary sacrifice: the switch starts off and turns on.
    await expect((sacrifice as HTMLInputElement).checked).toBe(false);
    await userEvent.click(sacrifice);
    await expect((sacrifice as HTMLInputElement).checked).toBe(true);
  },
};

export const NoSalary: Story = {
  args: { initialSalary: null },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByRole("link", { name: "Add salary" })[0]).toBeDefined();
  },
};
