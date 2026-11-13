import type { Meta, StoryObj } from "@storybook/react";
import { MemoryRouter } from "react-router";
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

export const SignedIn: Story = {
  args: { to: "/app/debt", children: "Open" },
};

export const SandboxDisabled: Story = {
  args: { to: "/app/debt", children: "Open", sampleLabel: "Sign up to open" },
  decorators: [
    (Story) => (
      <SampleModeProvider value>
        <Story />
      </SampleModeProvider>
    ),
  ],
};
