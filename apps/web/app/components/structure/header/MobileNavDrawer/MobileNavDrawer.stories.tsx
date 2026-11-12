import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import MobileNavDrawer from "./MobileNavDrawer";

const meta: Meta<typeof MobileNavDrawer> = {
  title: "Navigation/MobileNavDrawer",
  component: MobileNavDrawer,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen", viewport: { defaultViewport: "mobile1" } },
  args: {
    isOpen: true,
    user: { id: "1", email: "sam@example.com", name: "Sam Taylor" },
    onClose: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof MobileNavDrawer>;

export const SignedIn: Story = {
  play: async ({ canvasElement, args }) => {
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.click(body.getByLabelText("Close navigation menu"));
    await expect(args.onClose).toHaveBeenCalled();
  },
};

export const SignedOut: Story = { args: { user: null } };

export const Dark: Story = {
  globals: { theme: "dark" },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    await expect(body.getByRole("dialog")).toBeInTheDocument();
  },
};
