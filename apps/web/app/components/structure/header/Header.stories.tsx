import type { Meta, StoryObj } from "@storybook/react";
import Header from "./Header";

const meta: Meta<typeof Header> = {
  title: "Structure/Header",
  component: Header,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Header>;

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
  // E8 waiver: label-content-name-mismatch
  parameters: {
    a11y: { test: "todo" },
    router: {
      loaderData: {
        user: { id: "1", name: "Marc Gallagher", email: "marc@example.com" },
      },
    },
  },
};
