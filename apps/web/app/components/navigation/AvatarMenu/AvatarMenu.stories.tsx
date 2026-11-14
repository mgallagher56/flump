import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "storybook/test";
import AvatarMenu from "./AvatarMenu";

const meta: Meta<typeof AvatarMenu> = {
  title: "3. Patterns/Navigation/AvatarMenu",
  component: AvatarMenu,
  args: { user: { id: "1", firstName: "Sam", lastName: "Jordan" } },
};
export default meta;
type Story = StoryObj<typeof AvatarMenu>;

export const Closed: Story = {
  play: async ({ canvasElement }) => {
    const trigger = within(canvasElement).getByRole("button", { name: /account menu/i });
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
  },
};

export const Open: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole("button", { name: /account menu/i });
    await userEvent.click(trigger);
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(canvas.getAllByRole("menuitem")).toHaveLength(4);
    await userEvent.keyboard("{Escape}");
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
  },
};

export const Dark: Story = {
  globals: { theme: "dark" },
  play: Open.play,
};
