import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import UserLogin from "./UserLogin";

const meta: Meta<typeof UserLogin> = {
  title: "3. Patterns/Navigation/UserLogin",
  component: UserLogin,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof UserLogin>;

export const LoggedOut: Story = {
  parameters: {
    router: {
      loaderData: {
        user: null,
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("link", { name: /sign up/i })).toHaveAttribute("href", "/signup");
    await expect(canvas.getByRole("link", { name: /sign in/i })).toHaveAttribute("href", "/login");
  },
};

export const LoggedIn: Story = {
  parameters: {
    router: {
      loaderData: {
        user: { id: "1", email: "sam@example.com", name: "Sam Jordan" },
      },
    },
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("button", { name: /sign out/i })).toHaveAttribute(
      "type",
      "submit",
    );
  },
};
