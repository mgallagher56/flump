import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { AccountDeletedNotice } from "./AccountDeletedNotice";

const meta: Meta<typeof AccountDeletedNotice> = {
  title: "3. Patterns/Settings/AccountDeletedNotice",
  component: AccountDeletedNotice,
  args: { homeUrl: "https://example.com" },
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof AccountDeletedNotice>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("heading", { name: "Your account has been deleted" }),
    ).toBeDefined();
    const home = canvas.getByRole("link", { name: "Go to the Flump homepage" });
    await expect(home.getAttribute("href")).toBe("https://example.com");
  },
};

export const DeletionPending: Story = {
  args: { pending: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("heading", { name: "Finish deleting your account" }),
    ).toBeDefined();
  },
};
