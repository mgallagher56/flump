import type { Meta, StoryObj } from "@storybook/react";
import { TrendingDown } from "lucide-react";
import { expect, within } from "storybook/test";
import { DisabledNavItem } from "./DisabledNavItem";

const meta: Meta<typeof DisabledNavItem> = {
  title: "Navigation/DisabledNavItem",
  component: DisabledNavItem,
  args: { id: "nav-disabled-debt", label: "Debt", icon: <TrendingDown size={16} /> },
};
export default meta;
type Story = StoryObj<typeof DisabledNavItem>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole("button");
    await expect(button).toHaveAttribute("aria-disabled", "true");
    await expect(button).toHaveAccessibleDescription(/sign up to open/i);
  },
};

export const Dark: Story = {
  globals: { theme: "dark" },
};
