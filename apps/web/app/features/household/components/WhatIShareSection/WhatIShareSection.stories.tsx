import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { WhatIShareSection } from "./WhatIShareSection";

const meta: Meta<typeof WhatIShareSection> = {
  title: "3. Patterns/Household/WhatIShareSection",
  component: WhatIShareSection,
  parameters: { layout: "padded" },
  args: { sharesJointSummary: false, pending: false, error: null, onChange: fn() },
};

export default meta;
type Story = StoryObj<typeof WhatIShareSection>;

export const Off: Story = {
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole("switch"));
    await expect(args.onChange).toHaveBeenCalledWith(true);
  },
};

export const OffDark: Story = { globals: { theme: "dark" } };

export const On: Story = { args: { sharesJointSummary: true } };

export const OnDark: Story = { args: { sharesJointSummary: true }, globals: { theme: "dark" } };
