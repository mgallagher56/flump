import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { css } from "../../../styled-system/css";
import { Spinner } from "./Spinner";

const meta: Meta<typeof Spinner> = {
  title: "2. Primitives/Spinner",
  component: Spinner,
  parameters: { layout: "centered" },
};

export default meta;
type Story = StoryObj<typeof Spinner>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("status")).toHaveTextContent("Loading");
  },
};

export const Sizes: Story = {
  render: () => (
    <div className={css({ display: "flex", gap: "6", alignItems: "center" })}>
      <Spinner size="sm" label="Loading small" />
      <Spinner size="md" label="Loading medium" />
      <Spinner size="lg" label="Loading large" />
    </div>
  ),
};

export const CustomLabel: Story = {
  args: { label: "Calculating your payoff date", size: "lg" },
};

export const Inherit: Story = {
  render: () => (
    <div className={css({ color: "text.primary" })}>
      <Spinner tone="inherit" size="md" />
    </div>
  ),
};

export const Dark: Story = { ...Sizes, globals: { theme: "dark" } };
