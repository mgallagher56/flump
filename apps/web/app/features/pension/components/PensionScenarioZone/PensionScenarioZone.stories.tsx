import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { PensionScenarioZone } from "./PensionScenarioZone";

const meta: Meta<typeof PensionScenarioZone> = {
  title: "3. Financial Patterns & Sections/PensionScenarioZone",
  component: PensionScenarioZone,
  parameters: { layout: "padded" },
  args: {
    basis: "£50,000 salary, 6% you and 4% your employer",
    isModified: false,
    onReset: fn(),
    onEditDetails: fn(),
    children: <p>Levers and outcomes go here.</p>,
  },
};

export default meta;
type Story = StoryObj<typeof PensionScenarioZone>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Illustration, not saved")).toBeDefined();
    await expect(canvas.queryByRole("button", { name: "Reset to saved figures" })).toBeNull();
  },
};

export const Modified: Story = {
  args: { isModified: true },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Reset to saved figures" }));
    await expect(args.onReset).toHaveBeenCalled();
  },
};
