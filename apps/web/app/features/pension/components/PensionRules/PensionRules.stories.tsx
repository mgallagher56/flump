import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "storybook/test";
import { PensionRules } from "./PensionRules";

/** The Storybook preview renders every story side by side in light and dark. */
const meta: Meta<typeof PensionRules> = {
  title: "3. Patterns/Pension/PensionRules",
  component: PensionRules,
  parameters: { layout: "padded" },
  args: { annualPaidIn: 6_380, methodSet: true, isSalarySacrifice: true, passEmployerNi: true },
};

export default meta;
type Story = StoryObj<typeof PensionRules>;

export const Open: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const toggle = canvas.getAllByRole("button", { name: "UK pension rules" })[0] as HTMLElement;
    await userEvent.click(toggle);
    await expect(canvas.getAllByText(/standard annual allowance/)[0]).toBeDefined();
  },
};

export const MethodNotSet: Story = {
  args: { annualPaidIn: null, methodSet: false },
};
