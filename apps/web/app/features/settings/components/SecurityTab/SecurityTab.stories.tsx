import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "storybook/test";
import { SecurityTab } from "./SecurityTab";

const meta: Meta<typeof SecurityTab> = {
  title: "3. Patterns/Settings/SecurityTab",
  component: SecurityTab,
  parameters: { layout: "padded" },
  args: { email: "jane.doe@example.com" },
};

export default meta;
type Story = StoryObj<typeof SecurityTab>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId("user-email-display").textContent).toContain("@");
    await userEvent.click(canvas.getByRole("button", { name: "Change password" }));
    // No backend in Storybook, so the request fails and the fixed error shows.
    await expect(await canvas.findByTestId("password-reset-error")).toBeDefined();
  },
};

export const Dark: Story = { globals: { theme: "dark" } };

/** A beta admin also sees the link to the invites page. */
export const BetaAdmin: Story = {
  args: { isBetaAdmin: true },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole("link", { name: "Manage invites" }),
    ).toHaveAttribute("href", "/app/invites");
  },
};
