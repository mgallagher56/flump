import { css } from "@repo/ui/styled-system/css";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { MarketingBand } from "./MarketingBand";

const text = css({ textStyle: "body.lg", color: "text.secondary", margin: 0 });
const clip = css({ overflowX: "clip" });

const meta: Meta<typeof MarketingBand> = {
  title: "3. Patterns/Marketing/MarketingBand",
  component: MarketingBand,
  parameters: { layout: "fullscreen" },
  args: {
    id: "story-band",
    title: "Start with rough figures",
    subtitle: "A band in its tone, with a bubble field at its edges.",
    bubbles: "a",
    stop: "Rough figures",
  },
  render: (args) => (
    <div className={clip}>
      <MarketingBand {...args}>
        <p className={text}>Content sits above the bubbles and never under one.</p>
      </MarketingBand>
    </div>
  ),
};

export default meta;
type Story = StoryObj<typeof MarketingBand>;

const assertBand: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const band = canvas.getByRole("region", { name: "Start with rough figures" });
  await expect(band).toHaveAttribute("data-home-section-name", "Rough figures");
};

export const Light: Story = {
  args: { tone: "card" },
  globals: { theme: "light" },
  play: assertBand,
};

export const Dark: Story = {
  args: { tone: "canvas", bubbles: "b" },
  globals: { theme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
  play: assertBand,
};
