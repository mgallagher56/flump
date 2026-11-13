import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { AppBottomBar } from "./AppBottomBar";

const at = (pathname: string) => ({
  router: { location: { pathname, search: "", hash: "", state: null, key: pathname } },
});

const meta: Meta<typeof AppBottomBar> = {
  title: "Navigation/AppBottomBar",
  component: AppBottomBar,
  parameters: { layout: "fullscreen", viewport: { defaultViewport: "mobile1" } },
};
export default meta;
type Story = StoryObj<typeof AppBottomBar>;

export const SignedIn: Story = {
  args: { user: { id: "1" } },
  parameters: at("/app/budget"),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByTestId("mobile-bottom-bar")).toBeInTheDocument();
  },
};

export const SandboxSignedOut: Story = {
  args: { user: null },
  parameters: at("/sandbox"),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByTestId("mobile-bottom-bar")).toBeInTheDocument();
  },
};

export const SandboxSignedOutDark: Story = {
  globals: { theme: "dark" },
  args: { user: null },
  parameters: at("/sandbox"),
};
