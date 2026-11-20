import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { MarketingSection } from "./MarketingSection";

const meta: Meta<typeof MarketingSection> = {
  title: "3. Patterns/Marketing/MarketingSection",
  component: MarketingSection,
  parameters: { layout: "fullscreen" },
  args: {
    id: "story-section",
    title: "What you can see",
    subtitle: "A short line under the section title.",
    children: <p>Section content.</p>,
  },
  argTypes: { tone: { control: "select", options: ["canvas", "teal"] } },
};

export default meta;
type Story = StoryObj<typeof MarketingSection>;

const assertSection: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByRole("heading", { level: 2, name: "What you can see" })).toBeVisible();
};

export const CanvasLight: Story = {
  args: { tone: "canvas" },
  globals: { theme: "light" },
  play: assertSection,
};
export const TealLight: Story = {
  args: { tone: "teal" },
  globals: { theme: "light" },
  play: assertSection,
};
export const CanvasDark: Story = {
  args: { tone: "canvas" },
  globals: { theme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
  play: assertSection,
};
export const TealDark: Story = {
  args: { tone: "teal" },
  globals: { theme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
  play: assertSection,
};
