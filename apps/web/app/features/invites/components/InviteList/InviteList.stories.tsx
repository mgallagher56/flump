import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { InviteList } from "./InviteList";

const base = {
  createdAt: "2026-11-20T09:00:00.000Z",
  expiresAt: "2026-12-04T09:00:00.000Z",
  usedAt: null,
};

const meta: Meta<typeof InviteList> = {
  title: "Features/Invites/InviteList",
  component: InviteList,
  parameters: { layout: "padded" },
  args: {
    onCancel: fn(),
    invites: [
      { ...base, id: "00000000-0000-4000-8000-000000000001", label: "Sam", status: "unused" },
      {
        ...base,
        id: "00000000-0000-4000-8000-000000000002",
        label: "Alex",
        status: "used",
        usedAt: "2026-11-21T09:00:00.000Z",
      },
      { ...base, id: "00000000-0000-4000-8000-000000000003", label: null, status: "expired" },
    ],
  },
};

export default meta;
type Story = StoryObj<typeof InviteList>;

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    await userEvent.click(
      within(canvasElement).getByRole("button", { name: "Cancel link for Sam" }),
    );
    await expect(args.onCancel).toHaveBeenCalled();
  },
};

export const Empty: Story = { args: { invites: [] } };

export const Dark: Story = { globals: { theme: "dark" } };
