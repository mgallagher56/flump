import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { PensionDetails } from "./PensionDetails";

const meta: Meta<typeof PensionDetails> = {
  title: "3. Financial Patterns & Sections/PensionDetails",
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
    monthlyEmployeeContrib: 250,
    monthlyEmployerNiContrib: 0,
    ratesAssumed: false,
    standardMonthlyEmployerContrib: 167,
    updatedAt: "2026-11-05T10:30:00.000Z",
    onEditingChange: fn(),
    onSave: fn().mockResolvedValue(undefined),
  },
};

export default meta;
type Story = StoryObj<typeof PensionDetails>;

export const Saved: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Saved")).toBeDefined();
    await userEvent.click(canvas.getByRole("button", { name: "Edit details" }));
    await expect(args.onEditingChange).toHaveBeenCalledWith(true);
  },
};

export const Editing: Story = {
  args: { isEditing: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByLabelText(/Annual salary/)).toBeDefined();
    await expect(canvas.getByRole("button", { name: "Save details" })).toBeDefined();
  },
};

export const DefaultRates: Story = {
  args: { ratesAssumed: true, employeePercent: 5, employerPercent: 3 },
};
