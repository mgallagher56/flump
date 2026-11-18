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
  await expect(canvas.getByRole("link", { name: "Debt and borrowing" })).toBeInTheDocument();
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

/** Tablets (768px and up) use the desktop top bar: the bottom bar is phones only (owner ruling). */
export const Tablet: Story = {
  globals: { theme: "light" },
  parameters: { viewport: { defaultViewport: "tablet" } },
  play: async ({ canvasElement }) => {
    const bar = canvasElement.querySelector("nav");
    await expect(bar ? getComputedStyle(bar).display : "none").toBe("none");
  },
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
      canvas.getByRole("button", { name: "Debt and borrowing: Sign up to open" }),
    ).toBeInTheDocument();
    // Every label sits on one baseline, locked or not.
    const bottoms = Array.from(canvasElement.querySelectorAll("[data-nav-label]")).map((el) =>
      Math.round(el.getBoundingClientRect().bottom),
    );
    await expect(new Set(bottoms).size).toBe(1);
  },
};

export const LockedAt375Dark: Story = { ...LockedAt375, globals: { theme: "dark" } };

/**
 * The web app renders its last item, "More", as a button that opens the drawer. It must take the
 * same box as the links: same width, height and label style (owner report 2026-11-18).
 */
export const ButtonItem: Story = {
  globals: { theme: "light" },
  parameters: { viewport: { defaultViewport: "mobile1" } },
  args: {
    renderLink: (item, className, children, ariaCurrent) =>
      item.key === sampleNavItems[4]?.key ? (
        <button className={className} type="button">
          {children}
        </button>
      ) : (
        <a aria-current={ariaCurrent} className={className} href={item.href}>
          {children}
        </a>
      ),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const items = Array.from(canvasElement.querySelectorAll("nav li > *")) as HTMLElement[];
    await expect(items.at(-1)).toBe(canvas.getByRole("button", { name: sampleNavItems[4]?.label }));
    const boxes = items.map((el) => el.getBoundingClientRect());
    const widths = new Set(boxes.map((box) => Math.round(box.width)));
    const heights = new Set(boxes.map((box) => Math.round(box.height)));
    await expect(widths.size).toBe(1);
    await expect(heights.size).toBe(1);
    await expect(Math.min(...boxes.map((box) => box.height))).toBeGreaterThanOrEqual(44);
    const fonts = new Set(
      Array.from(canvasElement.querySelectorAll("[data-nav-label]")).map((el) => {
        const style = getComputedStyle(el);
        return `${style.fontFamily} ${style.fontSize} ${style.fontWeight}`;
      }),
    );
    await expect(fonts.size).toBe(1);
  },
};

export const ButtonItemDark: Story = { ...ButtonItem, globals: { theme: "dark" } };
