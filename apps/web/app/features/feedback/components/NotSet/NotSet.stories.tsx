import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { NotSet } from "./NotSet";

const meta: Meta<typeof NotSet> = {
  title: "3. Financial Patterns & Sections/NotSet",
  component: NotSet,
  // The Storybook decorator renders every story side by side in Light and Dark by default.
  args: { href: "/app/profile", subject: "salary" },
};

export default meta;
type Story = StoryObj<typeof NotSet>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const [link] = await canvas.findAllByRole("link", { name: "Add salary" });
    await expect(link.getAttribute("href")).toBe("/app/profile");
  },
};

export const CustomLabel: Story = {
  args: { label: "Not calculated yet", href: "/app/tax", subject: "income" },
};
