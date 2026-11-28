import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { StillMotionProvider } from "../../context/StillMotionContext";
import { HomeHero } from "./HomeHero";

const meta: Meta<typeof HomeHero> = {
  title: "3. Patterns/Marketing/HomeHero",
  component: HomeHero,
  parameters: { layout: "fullscreen" },
  decorators: [
    // The rest state, as with reduced motion: axe checks what a reader sees once a moment ends.
    (Story) => (
      <StillMotionProvider>
        <Story />
      </StillMotionProvider>
    ),
    (Story) => <Story />,
  ],
};

export default meta;
type Story = StoryObj<typeof HomeHero>;

/** The finished picture is always there: heading, both calls to action and the named dashboard. */
const assertFinished: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(
    canvas.getByRole("heading", { level: 1, name: "All your money. One clear picture." }),
  ).toBeVisible();
  await expect(canvas.getByRole("link", { name: "Interactive preview" })).toBeVisible();
  await expect(canvas.getByRole("figure", { name: "Monthly picture Example" })).toBeVisible();
  await expect(canvas.getByRole("heading", { level: 3, name: "Made from" })).toBeVisible();
};

export const Light: Story = { globals: { theme: "light" }, play: assertFinished };

export const Dark: Story = {
  globals: { theme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
  play: assertFinished,
};
