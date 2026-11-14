import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { DeleteAccountSection } from "./DeleteAccountSection";

const meta: Meta<typeof DeleteAccountSection> = {
  title: "3. Financial Patterns & Sections/Settings/DeleteAccountSection",
  component: DeleteAccountSection,
  args: { status: "idle", onConfirm: fn() },
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof DeleteAccountSection>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { name: "Delete your account" })).toBeDefined();
    await expect(canvas.queryByRole("alertdialog")).toBeNull();
  },
};

export const ConfirmDialogOpen: Story = {
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByTestId("delete-account-trigger"));
    const body = within(document.body);
    const confirm = (await body.findByRole("button", {
      name: "Delete my account",
    })) as HTMLButtonElement;
    await expect(confirm.disabled).toBe(true);
    await userEvent.type(body.getByLabelText(/to confirm/i), "DELETE");
    await expect(confirm.disabled).toBe(false);
    await userEvent.click(confirm);
    await expect(args.onConfirm).toHaveBeenCalledTimes(1);
  },
};

export const IdentityPending: Story = {
  args: { status: "identity_pending" },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByTestId("delete-account-trigger"));
    const body = within(document.body);
    const alert = await body.findByRole("alert");
    await expect(alert.textContent).toContain("could not finish removing your login");
    await expect(body.getByRole("button", { name: "Try again" })).toBeDefined();
  },
};
