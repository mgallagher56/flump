import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { css } from "../../../styled-system/css";
import { Heading } from "./Heading";

const stack = css({ display: "flex", flexDirection: "column", gap: "3" });

const meta: Meta<typeof Heading> = {
  title: "2. Primitives/Heading",
  component: Heading,
  parameters: { layout: "padded" },
  args: { children: "Where you stand" },
};

export default meta;
type Story = StoryObj<typeof Heading>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getAllByRole("heading", { name: "Where you stand" }).length,
    ).toBeGreaterThan(0);
  },
};

const Sizes = () => (
  <div className={stack}>
    <Heading as="h1" size="display">
      Good morning, Sam
    </Heading>
    <Heading as="h2" size="xl">
      Where you stand
    </Heading>
    <Heading as="h2">Over time and by account</Heading>
    <Heading as="h3" size="md">
      What changed this month
    </Heading>
    <Heading as="h4" size="sm">
      Your next steps
    </Heading>
    <Heading as="h4" color="secondary" size="sm">
      A level four, set small and secondary
    </Heading>
  </div>
);

const sizesPlay: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getAllByRole("heading", { level: 1 }).length).toBeGreaterThan(0);
  await expect(canvas.getAllByRole("heading").length % 6).toBe(0);
};

export const AllSizes: Story = { render: () => <Sizes />, play: sizesPlay };

export const Light: Story = {
  globals: { theme: "light" },
  render: () => <Sizes />,
  play: sizesPlay,
};

export const Dark: Story = { globals: { theme: "dark" }, render: () => <Sizes />, play: sizesPlay };
