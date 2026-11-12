import type { Meta, StoryObj } from "@storybook/react";
import HomeLogo from "./HomeLogo";

// Link semantics (single named link, decorative variant) are asserted in HomeLogo.test.tsx; the
// shared test setup stubs the router Link, so stories cover the visual states in both themes.
const meta: Meta<typeof HomeLogo> = {
  title: "Navigation/HomeLogo",
  component: HomeLogo,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof HomeLogo>;

export const Default: Story = {};

/** Used beside a "Home" nav link: the logo link is removed from the accessibility tree. */
export const Decorative: Story = {
  args: { decorative: true },
};
