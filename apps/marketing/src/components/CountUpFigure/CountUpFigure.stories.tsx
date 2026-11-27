import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { CountUpFigure } from "./CountUpFigure";

const meta: Meta<typeof CountUpFigure> = {
  title: "3. Patterns/Marketing/CountUpFigure",
  component: CountUpFigure,
  parameters: { layout: "padded" },
  args: { value: 232_000, format: "gbp100" },
};

export default meta;
type Story = StoryObj<typeof CountUpFigure>;

const assertFigure: Story["play"] = async ({ canvasElement }) => {
  // The final value is read out at once, whatever the digits show while they count.
  await expect(
    within(canvasElement).getByText("£232,000", { selector: "span:not([aria-hidden])" }),
  ).toBeInTheDocument();
};

export const Light: Story = { globals: { theme: "light" }, play: assertFigure };

export const Dark: Story = {
  globals: { theme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
  play: assertFigure,
};
