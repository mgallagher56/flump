import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { BtlOverview } from "./BtlOverview";

const meta: Meta<typeof BtlOverview> = {
  title: "3. Patterns/Mortgage/BtlOverview",
  component: BtlOverview,
  parameters: { layout: "padded" },
  args: {
    properties: [
      { id: "r1", name: "Flat 2" },
      { id: "r2", name: "Harbour Street" },
    ],
    onManage: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof BtlOverview>;

export const Populated: Story = {
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: "Edit on Accounts" }));
    await expect(args.onManage).toHaveBeenCalled();
  },
};

export const NoProperties: Story = {
  args: { properties: [] },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByText("No rental property saved on Accounts yet"),
    ).toBeTruthy();
  },
};

export const Dark: Story = { globals: { theme: "dark" } };
