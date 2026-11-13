import type { Meta, StoryObj } from "@storybook/react";
import { MemoryRouter } from "react-router";
import { expect, within } from "storybook/test";
import { AppBottomBar } from "./AppBottomBar";

const meta: Meta<typeof AppBottomBar> = {
  title: "Navigation/AppBottomBar",
  component: AppBottomBar,
  parameters: { layout: "fullscreen", viewport: { defaultViewport: "mobile1" } },
};
export default meta;
type Story = StoryObj<typeof AppBottomBar>;

export const SignedIn: Story = {
  args: { user: { id: "1" } },
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={["/app/budget"]}>
        <Story />
      </MemoryRouter>
    ),
  ],
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByTestId("mobile-bottom-bar")).toBeInTheDocument();
  },
};

export const SandboxSignedOut: Story = {
  args: { user: null },
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={["/sandbox"]}>
        <Story />
      </MemoryRouter>
    ),
  ],
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByTestId("mobile-bottom-bar")).toBeInTheDocument();
  },
};
