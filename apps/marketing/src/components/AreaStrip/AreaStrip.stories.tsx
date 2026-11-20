import type { Meta, StoryObj } from "@storybook/react";
import { MemoryRouter } from "react-router-dom";
import { expect, within } from "storybook/test";
import { AreaStrip } from "./AreaStrip";

const meta: Meta<typeof AreaStrip> = {
  title: "3. Patterns/Marketing/AreaStrip",
  component: AreaStrip,
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
  args: { current: "budget" },
};

export default meta;
type Story = StoryObj<typeof AreaStrip>;

const assertStrip: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getAllByRole("link")).toHaveLength(5);
  await expect(canvas.getByRole("link", { current: "page" })).toHaveTextContent(/^Budget/);
};

export const Light: Story = { globals: { theme: "light" }, play: assertStrip };

export const Dark: Story = {
  globals: { theme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
  play: assertStrip,
};
