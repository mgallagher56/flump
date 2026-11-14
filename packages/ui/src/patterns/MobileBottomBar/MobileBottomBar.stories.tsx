import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { Lock } from "lucide-react";
import { Icon } from "../../primitives/Icon/Icon";
import { sampleNavItems } from "../AppShell/AppShell.fixtures";
import { MobileBottomBar } from "./MobileBottomBar";

const meta: Meta<typeof MobileBottomBar> = {
  title: "3. Patterns/MobileBottomBar",
  component: MobileBottomBar,
  parameters: { layout: "fullscreen" },
  args: { items: sampleNavItems, activeKey: "home" },
};

export default meta;
type Story = StoryObj<typeof MobileBottomBar>;

const play: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByRole("navigation", { name: "Primary mobile" })).toBeInTheDocument();
  await expect(canvas.getByRole("link", { name: "Home" })).toHaveAttribute("aria-current", "page");
  await expect(canvas.getByRole("link", { name: "Borrowing" })).toBeInTheDocument();
};

export const Light: Story = {
  globals: { theme: "light" },
  parameters: { viewport: { defaultViewport: "mobile1" } },
  play,
};

export const Dark: Story = {
  globals: { theme: "dark" },
  parameters: { viewport: { defaultViewport: "mobile1" } },
  play,
};

/** 768 to 1023px: no inline top bar items, so the bottom bar must still be present. */
export const Tablet: Story = {
  globals: { theme: "light" },
  parameters: { viewport: { defaultViewport: "tablet" } },
  play,
};

/**
 * The sandbox locks every slot but Home and More: the lock sits beside the icon as a badge, so all
 * five labels share one baseline at 375 (RESCORE B7).
 */
export const LockedAt375: Story = {
  globals: { theme: "light" },
  parameters: { viewport: { defaultViewport: "mobile1" } },
  args: {
    renderLink: (item, className, children, ariaCurrent) => {
      const locked = item.key !== "home" && item.key !== "more";
      return locked ? (
        <button
          aria-disabled="true"
          aria-label={`${item.label}: Sign up to open`}
          className={className}
          type="button"
        >
          {children}
          <Icon icon={Lock} size="sm" />
        </button>
      ) : (
        <a aria-current={ariaCurrent} className={className} href={item.href}>
          {children}
        </a>
      );
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("button", { name: "Borrowing: Sign up to open" }),
    ).toBeInTheDocument();
    // Every label sits on one baseline, locked or not.
    const bottoms = Array.from(canvasElement.querySelectorAll("[data-nav-label]")).map((el) =>
      Math.round(el.getBoundingClientRect().bottom),
    );
    await expect(new Set(bottoms).size).toBe(1);
  },
};

export const LockedAt375Dark: Story = { ...LockedAt375, globals: { theme: "dark" } };
