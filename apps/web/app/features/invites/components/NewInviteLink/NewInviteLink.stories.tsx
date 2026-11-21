import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { NewInviteLink } from "./NewInviteLink";

const meta: Meta<typeof NewInviteLink> = {
  title: "3. Patterns/Invites/NewInviteLink",
  component: NewInviteLink,
  parameters: { layout: "padded" },
  args: {
    link: "https://app.example/invite/sample-link-for-the-story",
    expiresAt: "2026-12-04T10:00:00.000Z",
    label: "Sam",
  },
};

export default meta;
type Story = StoryObj<typeof NewInviteLink>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("button", { name: "Copy link" })).toBeInTheDocument();
    await expect(canvas.getByText(/4 Dec 2026/)).toBeInTheDocument();
  },
};

export const Dark: Story = { globals: { theme: "dark" } };
