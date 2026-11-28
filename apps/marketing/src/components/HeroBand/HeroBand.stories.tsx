import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { StillHeroOrbs } from "../StillHeroOrbs";
import { HeroBand } from "./HeroBand";

const meta: Meta<typeof HeroBand> = {
  title: "3. Patterns/Marketing/HeroBand",
  component: HeroBand,
  parameters: { layout: "fullscreen" },
  args: {
    titleId: "story-title",
    title: "Pricing",
    lead: "One plan you can use today.",
    compact: true,
    orbs: <StillHeroOrbs tones={["sky", "violet", "teal", "rose"]} />,
  },
};

export default meta;
type Story = StoryObj<typeof HeroBand>;

const assertBand: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByRole("heading", { level: 1, name: "Pricing" })).toBeVisible();
  await expect(canvas.getByTestId("hero-stage").querySelectorAll("[data-glass-orb]")).toHaveLength(
    4,
  );
};

export const Light: Story = { globals: { theme: "light" }, play: assertBand };

export const Dark: Story = {
  globals: { theme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
  play: assertBand,
};
