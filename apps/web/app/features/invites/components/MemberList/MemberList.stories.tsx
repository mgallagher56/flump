import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { MemberList } from "./MemberList";

const meta: Meta<typeof MemberList> = {
  title: "Features/Invites/MemberList",
  component: MemberList,
  parameters: { layout: "padded" },
  args: {
    onRemove: fn(),
    members: [
      { userId: "user_sam", label: "Sam", addedAt: "2026-11-21T09:00:00.000Z" },
      { userId: "user_x", label: null, addedAt: "2026-11-22T09:00:00.000Z" },
    ],
  },
};

export default meta;
type Story = StoryObj<typeof MemberList>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole("button", { name: "Remove access for Sam" }),
    );
    const body = within(canvasElement.ownerDocument.body);
    await expect(body.getByRole("alertdialog")).toBeInTheDocument();
  },
};

export const Empty: Story = { args: { members: [] } };

export const Dark: Story = { globals: { theme: "dark" } };
