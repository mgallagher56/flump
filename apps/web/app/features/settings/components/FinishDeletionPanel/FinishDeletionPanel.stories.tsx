import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { FinishDeletionPanel } from "./FinishDeletionPanel";

const meta: Meta<typeof FinishDeletionPanel> = {
  title: "3. Patterns/Settings/FinishDeletionPanel",
  component: FinishDeletionPanel,
  args: { status: "idle", onConfirm: fn() },
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof FinishDeletionPanel>;

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const submit = canvas.getByRole("button", { name: "Remove my login" }) as HTMLButtonElement;
    await expect(submit.disabled).toBe(true);
    await userEvent.type(canvas.getByLabelText("Type DELETE to confirm"), "DELETE");
    await expect(submit.disabled).toBe(false);
    await userEvent.click(submit);
    await expect(args.onConfirm).toHaveBeenCalledTimes(1);
  },
};

export const Pending: Story = {
  args: { status: "submitting" },
};
