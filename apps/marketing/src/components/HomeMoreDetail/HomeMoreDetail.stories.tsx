import type { Meta, StoryObj } from "@storybook/react";
import { MemoryRouter } from "react-router-dom";
import { expect, within } from "storybook/test";
import { HomeMoreDetail } from "./HomeMoreDetail";

const meta: Meta<typeof HomeMoreDetail> = {
  title: "3. Patterns/Marketing/HomeMoreDetail",
  component: HomeMoreDetail,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof HomeMoreDetail>;

const assertList: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getAllByRole("listitem")).toHaveLength(4);
  await expect(canvas.getByRole("link", { name: "About pay in Flump" })).toBeVisible();
};

export const Light: Story = { globals: { theme: "light" }, play: assertList };

export const Dark: Story = {
  globals: { theme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
  play: assertList,
};
