import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import MobileBottomBar from "./MobileBottomBar";

const meta: Meta<typeof MobileBottomBar> = {
  title: "Navigation/MobileBottomBar",
  component: MobileBottomBar,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen", viewport: { defaultViewport: "mobile1" } },
  args: { isMobile: true, user: { id: "1" }, onMoreClick: fn() },
};

export default meta;
type Story = StoryObj<typeof MobileBottomBar>;

export const SignedIn: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/^debt$/i)).toBeInTheDocument();
    await userEvent.click(canvas.getByTestId("mobile-bottom-bar-more"));
    await expect(args.onMoreClick).toHaveBeenCalled();
  },
};

export const Dark: Story = {
  globals: { theme: "dark" },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByTestId("mobile-bottom-bar")).toBeInTheDocument();
  },
};
