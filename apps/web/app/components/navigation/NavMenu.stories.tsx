import type { Meta, StoryObj } from "@storybook/react";
import { AUTH_DESKTOP_NAV_ROUTES } from "~/components/structure/header/Header";
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
      { key: "accounts", route: "/app/accounts" },
    ],
  },
};

export const GroupedPillars: Story = {
  args: {
    routes: [{ key: "home", route: "/" }, ...AUTH_DESKTOP_NAV_ROUTES],
  },
};
