import type { RetirementAccumulationPoint } from "@flump/finance-engine";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "storybook/test";
import { RetirementPotChart } from "./RetirementPotChart";

/** The Storybook preview renders every story side by side in light and dark. */
const meta: Meta<typeof RetirementPotChart> = {
  title: "Features/Retirement/RetirementPotChart",
  component: RetirementPotChart,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof RetirementPotChart>;

const points: RetirementAccumulationPoint[] = Array.from({ length: 23 }, (_, y) => {
  const paidIn = 95_000 + y * 7_800;
  return {
    age: 42 + y,
    yearIndex: y,
    potGbp: {
      lower: paidIn + y * y * 120,
      middle: paidIn + y * y * 380,
      higher: paidIn + y * y * 720,
    },
    paidInGbp: paidIn,
  };
});

export const Default: Story = {
  args: { points, growthCase: "middle" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const figures = canvas.getAllByRole("figure", { name: "Pot each year" });
    await expect(figures.length).toBeGreaterThan(0);
    const toggles = canvas.getAllByRole("button", { name: /Show data/ });
    if (toggles[0]) await userEvent.click(toggles[0]);
    const tables = canvas.getAllByRole("table");
    await expect(within(tables[0] as HTMLElement).getByText("42")).toBeTruthy();
  },
};

export const LowerCase: Story = {
  args: { points, growthCase: "lower" },
};

export const NotEnoughYears: Story = {
  args: { points: points.slice(0, 2), growthCase: "middle" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText(/not enough figures/i).length).toBeGreaterThan(0);
  },
};
