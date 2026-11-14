import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { SignInAgainButton } from "./SignInAgainButton";

const meta: Meta<typeof SignInAgainButton> = {
  title: "3. Patterns/Settings/SignInAgainButton",
  component: SignInAgainButton,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof SignInAgainButton>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("button", { name: "Sign in again" })).toBeDefined();
  },
};
