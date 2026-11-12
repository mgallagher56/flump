import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { css } from "../../../styled-system/css";
import { FlumpLogo } from "./FlumpLogo";

const row = css({
  display: "flex",
  alignItems: "flex-end",
  gap: "6",
  p: "6",
  backgroundColor: "surface.canvas",
});

const meta: Meta<typeof FlumpLogo> = {
  title: "2. Primitives/FlumpLogo",
  component: FlumpLogo,
  parameters: { layout: "padded" },
  render: () => (
    <div className={row}>
      <FlumpLogo label="Flump" size="sm" />
      <FlumpLogo label="Flump" size="md" />
      <FlumpLogo label="Flump" size="lg" />
    </div>
  ),
};

export default meta;
type Story = StoryObj<typeof FlumpLogo>;

const play: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getAllByRole("img", { name: "Flump" })).toHaveLength(3);
};

export const Light: Story = { globals: { theme: "light" }, play };

export const Dark: Story = { globals: { theme: "dark" }, play };
