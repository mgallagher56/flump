import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "storybook/test";
import { AUTH_NAV_ROUTES } from "~/components/navigation/navConfig";
import NavMenu from "./NavMenu";

const HOME = { key: "home", route: "/" };

const meta: Meta<typeof NavMenu> = {
  title: "3. Patterns/Navigation/NavMenu",
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
    const trigger = canvas.getByTestId("nav-dropdown-trigger-savingsAndPension");
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

const sandboxArgs = {
  isMobile: true,
  routes: [HOME, ...AUTH_NAV_ROUTES],
  isRouteDisabled: (item: { key: string }) => item.key !== "home",
};

export const SandboxMobile: Story = {
  args: sandboxArgs,
  play: async ({ canvasElement }) => {
    const item = within(canvasElement).getByTestId("nav-disabled-debt");
    await expect(item).toHaveAttribute("aria-disabled", "true");
    await expect(item).toHaveAccessibleDescription(/sign up to open/i);
  },
};

export const SandboxMobileDark: Story = {
  globals: { theme: "dark" },
  args: sandboxArgs,
};
