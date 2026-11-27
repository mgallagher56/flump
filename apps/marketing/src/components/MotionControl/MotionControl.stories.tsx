import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "storybook/test";
import { AmbientMotionProvider } from "../../context/AmbientMotionContext";
import { MotionControl } from "./MotionControl";

const meta: Meta<typeof MotionControl> = {
  title: "3. Patterns/Marketing/MotionControl",
  component: MotionControl,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <AmbientMotionProvider>
        <Story />
      </AmbientMotionProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof MotionControl>;

const assertToggle: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const pause = canvas.queryByRole("button", { name: "Pause background animation" });
  // With reduced motion (as in the a11y runner) the control is hidden: nothing ambient moves.
  if (!pause) return;
  await userEvent.click(pause);
  await expect(canvas.getByRole("button", { name: "Play background animation" })).toBeVisible();
};

export const Light: Story = { globals: { theme: "light" }, play: assertToggle };

export const Dark: Story = {
  globals: { theme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
  play: assertToggle,
};
