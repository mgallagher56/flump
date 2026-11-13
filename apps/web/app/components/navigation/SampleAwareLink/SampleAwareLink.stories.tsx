import type { Meta, StoryObj } from "@storybook/react";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router";
import { expect, within } from "storybook/test";
import { SampleModeProvider } from "~/context/SampleModeContext";
import { SampleAwareLink } from "./SampleAwareLink";

const meta: Meta<typeof SampleAwareLink> = {
  title: "Navigation/SampleAwareLink",
  component: SampleAwareLink,
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof SampleAwareLink>;

const sandbox = (Story: () => ReactElement) => (
  <SampleModeProvider value>
    <Story />
  </SampleModeProvider>
);

export const SignedIn: Story = {
  args: { to: "/app/debt", children: "Open" },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("link", { name: "Open" })).toHaveAttribute(
      "href",
      "/app/debt",
    );
  },
};

export const SandboxDisabled: Story = {
  args: { to: "/app/debt", children: "Open" },
  decorators: [sandbox],
  play: async ({ canvasElement }) => {
    const item = within(canvasElement).getByRole("button", { name: /sign up to open/i });
    await expect(item).toHaveAttribute("aria-disabled", "true");
    await expect(item).not.toHaveAttribute("href");
  },
};

export const SandboxDisabledDark: Story = {
  globals: { theme: "dark" },
  args: { to: "/app/debt", children: "Open" },
  decorators: [sandbox],
};
