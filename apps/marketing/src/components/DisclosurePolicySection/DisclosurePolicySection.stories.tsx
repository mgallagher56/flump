import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { DisclosurePolicySection } from "./DisclosurePolicySection";

const meta: Meta<typeof DisclosurePolicySection> = {
  title: "Marketing/DisclosurePolicySection",
  component: DisclosurePolicySection,
};

export default meta;
type Story = StoryObj<typeof DisclosurePolicySection>;

const assertSection: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(
    canvas.getByRole("heading", { level: 2, name: "Reporting a security issue" }),
  ).toBeInTheDocument();
  await expect(canvas.getByText(/not available yet/i)).toBeInTheDocument();
};

export const Light: Story = { globals: { theme: "light" }, play: assertSection };

export const Dark: Story = {
  globals: { theme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
  play: assertSection,
};
