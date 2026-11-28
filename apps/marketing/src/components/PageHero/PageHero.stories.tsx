import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { StillMotionProvider } from "../../context/StillMotionContext";
import { PageHero } from "./PageHero";

const meta: Meta<typeof PageHero> = {
  title: "3. Patterns/Marketing/PageHero",
  component: PageHero,
  parameters: { layout: "fullscreen" },
  decorators: [
    // The still orbs, as a weak device or reduced motion shows them: no story starts three.js.
    (Story) => (
      <StillMotionProvider>
        <Story />
      </StillMotionProvider>
    ),
  ],
  args: {
    titleId: "story-title",
    label: "Pay",
    title: "Take-home pay and Self Assessment",
    lead: "Your take-home pay, and an estimate of what a change would do to it.",
    previewHref: "/preview",
    tones: ["teal", "rose", "sky", "violet"],
  },
};

export default meta;
type Story = StoryObj<typeof PageHero>;

const assertHero: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(
    canvas.getByRole("heading", { level: 1, name: "Take-home pay and Self Assessment" }),
  ).toBeVisible();
  await expect(canvas.getByRole("link", { name: "Request an invite" })).toBeVisible();
};

export const Light: Story = { globals: { theme: "light" }, play: assertHero };

export const Dark: Story = {
  globals: { theme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
  play: assertHero,
};
