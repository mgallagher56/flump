import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { StillMotionProvider } from "../../context/StillMotionContext";
import { JourneyFigure } from "./JourneyFigure";

const gbp = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

const meta: Meta<typeof JourneyFigure> = {
  title: "3. Patterns/Marketing/JourneyFigure",
  component: JourneyFigure,
  // The rest state, as with reduced motion: axe checks what a reader sees once a moment ends.
  decorators: [
    (Story) => (
      <StillMotionProvider>
        <Story />
      </StillMotionProvider>
    ),
  ],
  parameters: { layout: "padded" },
  args: { value: 232000, format: (n: number) => gbp.format(Math.round(n)) },
};

export default meta;
type Story = StoryObj<typeof JourneyFigure>;

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
