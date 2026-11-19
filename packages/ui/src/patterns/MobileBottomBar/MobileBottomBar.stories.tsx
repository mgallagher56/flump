import type { Meta, StoryObj } from "@storybook/react";
import { expect, waitFor, within } from "@storybook/test";
import { Lock } from "lucide-react";
import { Icon } from "../../primitives/Icon/Icon";
import { sampleNavItems } from "../AppShell/AppShell.fixtures";
import { MobileBottomBar } from "./MobileBottomBar";

/**
 * The bar's real labels are one short word (Home, Accounts, Budget, Pay, More), each fitting its
 * slot at 320px. The shared manifest's "Debt and borrowing" is a top-bar label, so the bar's
 * stories give that slot a bar-length label and check no label is cut short.
 */
const barItems = sampleNavItems.map((item) =>
  item.key === "borrowing" ? { ...item, label: "Debt" } : item,
);

const meta: Meta<typeof MobileBottomBar> = {
  title: "3. Patterns/MobileBottomBar",
  component: MobileBottomBar,
  parameters: { layout: "fullscreen" },
  args: { items: barItems, activeKey: "home" },
};

export default meta;
type Story = StoryObj<typeof MobileBottomBar>;

const play: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByRole("navigation", { name: "Primary mobile" })).toBeInTheDocument();
  await expect(canvas.getByRole("link", { name: "Home" })).toHaveAttribute("aria-current", "page");
  await expect(canvas.getByRole("link", { name: "Debt" })).toBeInTheDocument();
  // No label is cut short (phone audit P19; at large text labels wrap to two lines instead).
  for (const label of canvasElement.querySelectorAll<HTMLElement>("[data-nav-label]")) {
    await expect(label.scrollWidth).toBeLessThanOrEqual(label.clientWidth + 1);
  }
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

/**
 * 200% text, set as the phone sweep and browser text zoom do (the root font size doubled after the
 * page loads): every item stays on screen, labels wrap to two lines and none is cut short (phone
 * sweep 4). The bar is a container queried in rem, so the root size reaches it.
 */
const largeTextPlay: Story["play"] = async ({ canvasElement }) => {
  const root = document.documentElement;
  const before = root.style.fontSize;
  root.style.fontSize = "200%";
  try {
    const bar = canvasElement.querySelector("nav") as HTMLElement;
    if (getComputedStyle(bar).display === "none") return; // tablet and up: no bottom bar
    await waitFor(() =>
      expect(getComputedStyle(bar.querySelector("[data-nav-label]") as Element).whiteSpace).toBe(
        "normal",
      ),
    );
    await expect(bar.getBoundingClientRect().right).toBeLessThanOrEqual(window.innerWidth);
    for (const item of bar.querySelectorAll("li")) {
      const box = item.getBoundingClientRect();
      await expect(box.left).toBeGreaterThanOrEqual(0);
      await expect(box.right).toBeLessThanOrEqual(window.innerWidth);
    }
    for (const label of bar.querySelectorAll<HTMLElement>("[data-nav-label]")) {
      await expect(label.scrollWidth).toBeLessThanOrEqual(label.clientWidth + 1);
    }
    await expect(root.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
  } finally {
    root.style.fontSize = before;
  }
};

export const LargeText: Story = {
  globals: { theme: "light" },
  parameters: { viewport: { defaultViewport: "mobile2" } },
  play: largeTextPlay,
};

export const LargeTextDark: Story = { ...LargeText, globals: { theme: "dark" } };

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
    await expect(canvas.getByRole("button", { name: "Debt: Sign up to open" })).toBeInTheDocument();
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
