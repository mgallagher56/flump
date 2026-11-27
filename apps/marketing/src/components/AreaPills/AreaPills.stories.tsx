import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { StillMotionProvider } from "../../context/StillMotionContext";
import { AreaPills } from "./AreaPills";

const meta: Meta<typeof AreaPills> = {
  title: "3. Patterns/Marketing/AreaPills",
  component: AreaPills,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <StillMotionProvider>
        <Story />
      </StillMotionProvider>
    ),
  ],
  args: { current: "pay", tone: "card" },
};

export default meta;
type Story = StoryObj<typeof AreaPills>;

const assertPills: Story["play"] = async ({ canvasElement }) => {
  await expect(within(canvasElement).getByRole("link", { current: "page" })).toBeVisible();
};

export const Light: Story = { globals: { theme: "light" }, play: assertPills };

export const Dark: Story = {
  globals: { theme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
  play: assertPills,
};
