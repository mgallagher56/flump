import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "storybook/test";
import { AUTH_NAV_ROUTES } from "~/components/navigation/navConfig";
import NavMenu from "./NavMenu";

const HOME = { key: "home", route: "/" };

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
    routes: [{ key: "home", route: "/" }, ...AUTH_NAV_ROUTES],
  },
};

export const OpenFlyout: Story = {
  args: { routes: [HOME, ...AUTH_NAV_ROUTES] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByTestId("nav-dropdown-trigger-wealth");
    trigger.focus();
    await userEvent.keyboard("{Enter}");
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await userEvent.keyboard("{Escape}");
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
  },
};

export const Dark: Story = {
  globals: { theme: "dark" },
  args: { routes: [HOME, ...AUTH_NAV_ROUTES] },
};
