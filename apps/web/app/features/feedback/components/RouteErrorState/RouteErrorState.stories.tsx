import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { RouteErrorState } from "./RouteErrorState";

const meta: Meta<typeof RouteErrorState> = {
  title: "3. Financial Patterns & Sections/RouteErrorState",
  component: RouteErrorState,
  // The Storybook decorator renders every story side by side in Light and Dark by default.
  parameters: { layout: "padded" },
  args: { onRetry: fn() },
};

export default meta;
type Story = StoryObj<typeof RouteErrorState>;

export const Unavailable: Story = {
  args: { kind: "unavailable" },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    // The side-by-side theme decorator renders the story in each pane, so pick the first button.
    const [retry] = await canvas.findAllByRole("button", { name: "Try again" });
    await userEvent.click(retry);
    await expect(args.onRetry).toHaveBeenCalled();
  },
};

export const NotInvited: Story = {
  args: { kind: "not-invited", routeKey: "/app" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const [report] = await canvas.findAllByRole("link", { name: "Report this problem by email" });
    const href = decodeURIComponent(report.getAttribute("href") ?? "");
    await expect(href).toContain("mailto:");
    await expect(href).toContain("[/app]");
    await expect(href).not.toContain("body=");
  },
};

export const Retrying: Story = {
  args: { kind: "unavailable", retrying: true },
};

export const NotFound: Story = {
  args: { kind: "not-found", primaryHref: "/app/accounts", primaryLabel: "Back to accounts" },
};

export const Unauthorised: Story = {
  args: { kind: "unauthorised", signInAction: "/logout" },
};

export const Unknown: Story = {
  args: { kind: "unknown" },
};
