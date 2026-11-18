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
  // One line: no link columns.
  const footer = canvasElement.querySelector("footer");
  await expect(footer?.querySelectorAll("nav")).toHaveLength(0);
};

export const Light: Story = { globals: { theme: "light" }, play };

export const Dark: Story = { globals: { theme: "dark" }, play };

/** The narrowest phone: logo and company name still share one line. */
export const Phone320: Story = {
  globals: { theme: "light" },
  parameters: { viewport: { defaultViewport: "mobile1" } },
  play: async ({ canvasElement }) => {
    const text = within(canvasElement).getByText(/^© \d{4} /);
    await expect(text.getBoundingClientRect().height).toBeLessThan(30);
  },
};
