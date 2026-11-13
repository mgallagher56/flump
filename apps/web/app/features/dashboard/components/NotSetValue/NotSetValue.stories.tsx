import type { Meta, StoryObj } from "@storybook/react";
import { MemoryRouter } from "react-router";
import { expect, within } from "storybook/test";
import { NotSetValue } from "./NotSetValue";

const meta: Meta<typeof NotSetValue> = {
  title: "3. Financial Patterns & Sections/NotSetValue",
  component: NotSetValue,
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
  args: { href: "/app/budget", subject: "income" },
};

export default meta;
type Story = StoryObj<typeof NotSetValue>;

// The Storybook decorator renders light and dark side by side, so queries use the first match.
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText("Not set")[0]).toBeDefined();
    await expect(canvas.getAllByRole("link", { name: "Add income" })[0]).toBeDefined();
  },
};

export const CustomLabel: Story = {
  args: { label: "No debts added", subject: "a debt", href: "/app/accounts" },
};
