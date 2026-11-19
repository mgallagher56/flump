import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { AppFooter } from "./AppFooter";

const meta: Meta<typeof AppFooter> = {
  title: "3. Patterns/Structure/AppFooter",
  component: AppFooter,
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof AppFooter>;

const play: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByRole("link", { name: "Flump home" })).toHaveAttribute("href", "/");
  await expect(canvas.getByText(/^© \d{4} /)).toBeInTheDocument();
  await expect(canvas.getByRole("navigation", { name: "Footer" })).toBeInTheDocument();
  await expect(canvas.getByRole("link", { name: "Settings" })).toHaveAttribute(
    "href",
    "/app/profile",
  );
};

export const Light: Story = { globals: { theme: "light" }, play };

export const Dark: Story = { globals: { theme: "dark" }, play };

/** One line at the story's width: every shown link shares the logo's row. */
export const OneLine: Story = {
  globals: { theme: "light" },
  play: async ({ canvasElement }) => {
    const row = canvasElement.querySelector("footer > div");
    const links = Array.from(canvasElement.querySelectorAll("footer a")).filter(
      (el) => el.getBoundingClientRect().width > 0,
    );
    // One row: every shown link (the logo included) shares a vertical centre.
    const centres = links.map((el) => {
      const box = el.getBoundingClientRect();
      return box.top + box.height / 2;
    });
    await expect(Math.max(...centres) - Math.min(...centres)).toBeLessThanOrEqual(4);
    await expect(row?.getBoundingClientRect().height ?? 0).toBeLessThan(60);
  },
};
