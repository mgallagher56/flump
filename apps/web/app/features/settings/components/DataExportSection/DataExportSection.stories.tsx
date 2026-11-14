import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { AccountExportError } from "~/features/settings/accountExport";
import { DataExportSection } from "./DataExportSection";

const meta: Meta<typeof DataExportSection> = {
  title: "3. Patterns/Settings/DataExportSection",
  component: DataExportSection,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof DataExportSection>;

export const Default: Story = {
  args: { download: fn(async () => undefined) },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Download your data" }));
    await expect(args.download).toHaveBeenCalledTimes(1);
    await expect(await canvas.findByText("Your download has started.")).toBeDefined();
  },
};

export const Failed: Story = {
  args: { download: fn(async () => Promise.reject(new AccountExportError("failed"))) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Download your data" }));
    const alert = await canvas.findByRole("alert");
    await expect(alert.textContent).toContain("We could not prepare your download");
  },
};
