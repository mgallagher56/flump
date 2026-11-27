import type { Meta, StoryObj } from "@storybook/react";
import { MemoryRouter } from "react-router-dom";
import { expect, within } from "storybook/test";
import { StillMotionProvider } from "../../context/StillMotionContext";
import { HomeSecurity } from "./HomeSecurity";

const meta: Meta<typeof HomeSecurity> = {
  title: "3. Patterns/Marketing/HomeSecurity",
  component: HomeSecurity,
  parameters: { layout: "fullscreen" },
  decorators: [
    // The rest state, as with reduced motion: axe checks what a reader sees once a moment ends.
    (Story) => (
      <StillMotionProvider>
        <Story />
      </StillMotionProvider>
    ),
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof HomeSecurity>;

const assertCard: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(
    canvas.getByRole("heading", { level: 2, name: "Security and privacy" }),
  ).toBeVisible();
  await expect(canvas.getByRole("link", { name: "What Flump can and cannot do" })).toBeVisible();
};

export const Light: Story = { globals: { theme: "light" }, play: assertCard };

export const Dark: Story = {
  globals: { theme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
  play: assertCard,
};
