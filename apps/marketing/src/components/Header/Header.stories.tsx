import type { Meta, StoryObj } from "@storybook/react";
import { expect, waitFor, within } from "@storybook/test";
import { Header } from "./Header";

const meta: Meta<typeof Header> = {
  title: "3. Patterns/Marketing/Header",
  component: Header,
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj<typeof Header>;

const play: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByRole("link", { name: "Flump home" })).toBeInTheDocument();
  // One theme control shows at any width: the three-way switch from 1024px, one button below.
  await expect(
    canvasElement.querySelector("#theme-toggle, #theme-toggle-compact"),
  ).toBeInTheDocument();
};

export const Light: Story = { globals: { theme: "light" }, play };

export const Dark: Story = { globals: { theme: "dark" }, play };

/** 768px: the menu button, the one-button theme switch and the CTA, with no inline links (P72). */
export const Tablet: Story = {
  globals: { theme: "light" },
  parameters: { viewport: { defaultViewport: "tablet" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("button", { name: /open navigation menu/i })).toBeVisible();
    await expect(canvas.queryByRole("navigation", { name: "Primary" })).toBeNull();
  },
};

export const TabletDark: Story = { ...Tablet, globals: { theme: "dark" } };

/**
 * 200% text on a phone (the root font size doubled, as browser text zoom and the phone sweep do):
 * the bar keeps only the logo, the theme button and the menu button, all on screen; Sign in and
 * the invite stay in the menu (phone sweep 4). On a wide screen the bar is not cramped.
 */
const largeTextPlay: Story["play"] = async ({ canvasElement }) => {
  const root = document.documentElement;
  const before = root.style.fontSize;
  root.style.fontSize = "200%";
  try {
    const canvas = within(canvasElement);
    const header = canvasElement.querySelector("header") as HTMLElement;
    // The sign-in and sign-up group (its label depends on the site's sign-up mode).
    const auth = header.querySelector("[class*='container_top-bar']") as HTMLElement;
    await expect(auth).toBeInTheDocument();
    const cramped = header.clientWidth / Number.parseFloat(getComputedStyle(root).fontSize) <= 17;
    if (cramped) {
      await waitFor(() => expect(getComputedStyle(auth).display).toBe("none"));
      const menu = canvas.getByRole("button", { name: /open navigation menu/i });
      await expect(menu.getBoundingClientRect().right).toBeLessThanOrEqual(window.innerWidth);
    }
    for (const el of header.querySelectorAll("*")) {
      const box = el.getBoundingClientRect();
      if (box.width > 0) await expect(box.right).toBeLessThanOrEqual(window.innerWidth + 1);
    }
  } finally {
    root.style.fontSize = before;
  }
};

export const PhoneLargeText: Story = {
  globals: { theme: "light" },
  parameters: { viewport: { defaultViewport: "mobile2" } },
  play: largeTextPlay,
};

export const PhoneLargeTextDark: Story = { ...PhoneLargeText, globals: { theme: "dark" } };
