import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import MobileNavDrawer from "./MobileNavDrawer";

const meta: Meta<typeof MobileNavDrawer> = {
  title: "3. Patterns/Navigation/MobileNavDrawer",
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

export const SignedOut: Story = {
  args: { user: null },
  parameters: { router: { loaderData: { user: null, inviteOnly: false } } },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    await expect(body.getByRole("link", { name: /sign up/i })).toHaveAttribute("href", "/signup");
  },
};

/** While the beta is invite-only the drawer offers "Sign in" and no "Sign up". */
export const SignedOutInviteOnly: Story = {
  args: { user: null },
  parameters: { router: { loaderData: { user: null, inviteOnly: true } } },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    await expect(body.queryByRole("link", { name: /sign up/i })).toBeNull();
    await expect(body.getByRole("link", { name: /sign in/i })).toHaveAttribute("href", "/login");
  },
};

export const Dark: Story = {
  globals: { theme: "dark" },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    await expect(body.getByRole("dialog")).toBeInTheDocument();
  },
};
