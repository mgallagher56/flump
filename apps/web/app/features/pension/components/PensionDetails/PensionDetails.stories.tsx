import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { PensionDetails } from "./PensionDetails";

const meta: Meta<typeof PensionDetails> = {
  title: "3. Patterns/Pension/PensionDetails",
  component: PensionDetails,
  parameters: { layout: "padded" },
  args: {
    annualSalary: 50000,
    employeePercent: 6,
    employerPercent: 4,
    hasSalary: true,
    isEditing: false,
    isSalarySacrifice: true,
    isSalarySacrificeEmployerNi: false,
    ratesAssumed: false,
    onEditingChange: fn(),
    onSave: fn().mockResolvedValue(undefined),
  },
};

export default meta;
type Story = StoryObj<typeof PensionDetails>;

export const Saved: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getAllByRole("button", { name: "Salary and contributions" })[0] as HTMLElement,
    );
    await expect(canvas.getAllByText("Salary sacrifice")[0]).toBeDefined();
    await userEvent.click(
      canvas.getAllByRole("button", { name: "Edit salary and contributions" })[0] as HTMLElement,
    );
    await expect(args.onEditingChange).toHaveBeenCalledWith(true);
  },
};

export const Editing: Story = {
  args: { isEditing: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByLabelText(/Yearly salary before tax/)[0]).toBeDefined();
    await expect(canvas.getAllByRole("button", { name: "Save details" })[0]).toBeDefined();
  },
};

export const DefaultRates: Story = {
  args: { ratesAssumed: true, methodSet: false, employeePercent: 5, employerPercent: 3 },
};
