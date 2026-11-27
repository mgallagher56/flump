import type { Meta, StoryObj } from "@storybook/react";
import { MemoryRouter } from "react-router-dom";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { HomeFAQ } from "./HomeFAQ";

const meta: Meta<typeof HomeFAQ> = {
  title: "3. Patterns/Marketing/HomeFAQ",
  component: HomeFAQ,
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
type Story = StoryObj<typeof HomeFAQ>;

/** One answer opens in place as the other closes; the keyboard works as a button. */
const assertToggle: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const free = canvas.getByRole("button", { name: /Is Flump free\?/ });
  await userEvent.click(free);
  await expect(free).toHaveAttribute("aria-expanded", "true");
  await waitFor(() => expect(canvas.getByText(/free during the beta/)).toBeVisible());
  await expect(canvas.getByRole("button", { name: /connect my bank/ })).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  free.focus();
  await userEvent.keyboard("{Enter}");
  await expect(free).toHaveAttribute("aria-expanded", "false");
};

export const Light: Story = { globals: { theme: "light" }, play: assertToggle };

export const Dark: Story = {
  globals: { theme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
  play: assertToggle,
};
