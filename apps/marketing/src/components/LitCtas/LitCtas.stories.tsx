import { css } from "@repo/ui/styled-system/css";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { LitCtas } from "./LitCtas";

const frame = css({ p: "8", backgroundColor: "surface.canvas" });

const meta: Meta<typeof LitCtas> = {
  title: "3. Patterns/Marketing/LitCtas",
  component: LitCtas,
  parameters: { layout: "padded" },
  render: (args) => (
    <div className={frame}>
      <LitCtas {...args} />
    </div>
  ),
};

export default meta;
type Story = StoryObj<typeof LitCtas>;

const assertLinks: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByRole("link", { name: "Interactive preview" })).toBeVisible();
  await expect(canvas.getAllByRole("link")).toHaveLength(2);
};

export const Light: Story = { globals: { theme: "light" }, play: assertLinks };

export const Dark: Story = {
  globals: { theme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
  play: assertLinks,
};
