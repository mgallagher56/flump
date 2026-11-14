import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { MarketingSection } from "./MarketingSection";

const meta: Meta<typeof MarketingSection> = {
  title: "Marketing/MarketingSection",
  component: MarketingSection,
  parameters: { layout: "fullscreen" },
  args: {
    id: "story-section",
    title: "What you can see",
    subtitle: "A short line under the section title.",
    children: <p>Section content.</p>,
  },
  argTypes: { tone: { control: "select", options: ["canvas", "subtle", "sage", "apricot"] } },
};

export default meta;
type Story = StoryObj<typeof MarketingSection>;

const assertSection: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByRole("heading", { level: 2, name: "What you can see" })).toBeVisible();
};

export const SageLight: Story = {
  args: { tone: "sage" },
  globals: { theme: "light" },
  play: assertSection,
};
export const ApricotLight: Story = {
  args: { tone: "apricot" },
  globals: { theme: "light" },
  play: assertSection,
};
export const SageDark: Story = {
  args: { tone: "sage" },
  globals: { theme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
  play: assertSection,
};
export const ApricotDark: Story = {
  args: { tone: "apricot" },
  globals: { theme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
  play: assertSection,
};
