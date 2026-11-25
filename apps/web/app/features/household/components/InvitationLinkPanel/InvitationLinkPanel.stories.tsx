import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { InvitationLinkPanel } from "./InvitationLinkPanel";

const meta: Meta<typeof InvitationLinkPanel> = {
  title: "3. Patterns/Household/InvitationLinkPanel",
  component: InvitationLinkPanel,
  parameters: { layout: "padded" },
  args: {
    link: null,
    expiresAt: null,
    pending: null,
    error: null,
    onCreate: fn(),
    onCancel: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof InvitationLinkPanel>;

export const NoLink: Story = {
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: "Make a link" }));
    await expect(args.onCreate).toHaveBeenCalledTimes(1);
  },
};

export const NoLinkDark: Story = { globals: { theme: "dark" } };

export const LinkJustMade: Story = {
  args: {
    link: "https://app.example/household/join/sample-link-for-the-story",
    expiresAt: "2026-11-27T10:00:00.000Z",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("button", { name: "Copy link" })).toBeInTheDocument();
    await expect(canvas.getByText(/27 Nov 2026/)).toBeInTheDocument();
  },
};

export const LinkJustMadeDark: Story = { ...LinkJustMade, globals: { theme: "dark" } };

export const OpenLink: Story = { args: { expiresAt: "2026-11-27T10:00:00.000Z" } };

export const OpenLinkDark: Story = { ...OpenLink, globals: { theme: "dark" } };

export const WithError: Story = {
  args: {
    error:
      "You are already in a household. To join a different one, leave your current household first.",
  },
};
