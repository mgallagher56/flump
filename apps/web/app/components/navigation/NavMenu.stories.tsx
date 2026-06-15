import type { Meta, StoryObj } from "@storybook/react";
import NavMenu from "./NavMenu";

const meta: Meta<typeof NavMenu> = {
  title: "Navigation/NavMenu",
  component: NavMenu,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof NavMenu>;

export const Default: Story = {
  args: {
    routes: [
      { key: "home", route: "/" },
      { key: "dashboard", route: "/app" },
      { key: "accounts", route: "/app/accounts" },
    ],
  },
};
