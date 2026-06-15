import type { Meta, StoryObj } from "@storybook/react";
import UserLogin from "./UserLogin";

const meta: Meta<typeof UserLogin> = {
  title: "Navigation/UserLogin",
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
};

export const LoggedIn: Story = {
  parameters: {
    router: {
      loaderData: {
        user: { id: "1", email: "marc@example.com", name: "Marc Gallagher" },
      },
    },
  },
};
