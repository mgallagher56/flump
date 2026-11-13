import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { css } from "../../../styled-system/css";
import { Stepper } from "./Stepper";

const frame = css({
  backgroundColor: "surface.card",
  borderRadius: "xl",
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "border.subtle",
  padding: { base: "4", md: "6" },
  width: "min(960px, 94vw)",
});

const THREE = [
  { id: "you", label: "You and income" },
  { id: "home", label: "Housing and outgoings" },
  { id: "save", label: "Savings and debt" },
];

const FIVE = [
  ...THREE,
  { id: "goals", label: "Your goals" },
  { id: "review", label: "Review and finish" },
];

const meta: Meta<typeof Stepper> = {
  title: "2. Primitives/Stepper",
  component: Stepper,
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <div className={frame}>
        <Story />
      </div>
    ),
  ],
  args: { steps: THREE, current: 1 },
};

export default meta;
type Story = StoryObj<typeof Stepper>;

export const FirstStep: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const list = canvas.getByRole("list", { name: "Setup progress" });
    const items = within(list).getAllByRole("listitem");
    await expect(items[0]).toHaveAttribute("aria-current", "step");
    await expect(items[1]).not.toHaveAttribute("aria-current");
  },
};

export const MiddleStep: Story = {
  args: { steps: FIVE, current: 3 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const list = canvas.getByRole("list", { name: "Setup progress" });
    const items = within(list).getAllByRole("listitem");
    await expect(items[2]).toHaveAttribute("aria-current", "step");
    await expect(within(list).getAllByText("Complete")).toHaveLength(2);
  },
};

export const LastStep: Story = {
  args: { steps: FIVE, current: 5 },
};

export const LongLabels: Story = {
  args: {
    steps: [
      { id: "a", label: "Tell us about you and your household income" },
      { id: "b", label: "Housing, mortgage and regular outgoings" },
      { id: "c", label: "Savings, pensions and any debts you are paying off" },
    ],
    current: 2,
  },
};

/** Out-of-order flow: a skipped earlier step reads "Skipped", never "Complete". */
export const WithOverrides: Story = {
  args: {
    steps: FIVE,
    current: 4,
    states: { you: "complete", home: "skipped", save: "complete" },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const list = canvas.getByRole("list", { name: "Setup progress" });
    const items = within(list).getAllByRole("listitem");
    await expect(items[1]).toHaveAttribute("data-state", "skipped");
    await expect(within(list).getByText("Skipped")).toBeInTheDocument();
    await expect(within(list).getAllByText("Complete")).toHaveLength(2);
    await expect(items[3]).toHaveAttribute("aria-current", "step");
  },
};

export const WithOverridesDark: Story = { ...WithOverrides, globals: { theme: "dark" } };
