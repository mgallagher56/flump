import type { Meta, StoryObj } from "@storybook/react";
import { MemoryRouter } from "react-router-dom";
import { expect, userEvent, within } from "storybook/test";
import { HomeFAQ } from "./HomeFAQ";

const meta: Meta<typeof HomeFAQ> = {
  title: "Marketing/HomeFAQ",
  component: HomeFAQ,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof HomeFAQ>;

const assertToggle: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const free = canvas.getByRole("button", { name: /Is Flump free\?/ });
  await userEvent.click(free);
  await expect(free).toHaveAttribute("aria-expanded", "true");
  await expect(canvas.getByText(/free during the beta/)).toBeVisible();
};

export const Light: Story = { globals: { theme: "light" }, play: assertToggle };

export const Dark: Story = {
  globals: { theme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
  play: assertToggle,
};
