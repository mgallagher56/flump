import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { NetWorthBasisLine } from "./NetWorthBasisLine";

const meta: Meta<typeof NetWorthBasisLine> = {
  title: "3. Patterns/Accounts/NetWorthBasisLine",
  component: NetWorthBasisLine,
  parameters: { layout: "padded" },
  args: { leftOut: ["studentLoan"] },
};

export default meta;
type Story = StoryObj<typeof NetWorthBasisLine>;

export const StudentLoanLeftOut: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/Not counting your student loan\./)).toBeDefined();
    await expect(canvas.getByRole("link", { name: "Change what counts" })).toBeDefined();
  },
};

export const PropertyMortgageAndStudentLoanLeftOut: Story = {
  args: { leftOut: ["property", "mortgage", "studentLoan"] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText(/Not counting your property, mortgage or student loan\./),
    ).toBeDefined();
  },
};

export const HomeValueMissing: Story = {
  args: { leftOut: ["homeValueMissing"] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("link", { name: "Add an estimate" })).toBeDefined();
    await expect(canvas.queryByRole("link", { name: "Change what counts" })).toBeNull();
  },
};

export const NothingLeftOutWithLink: Story = {
  args: { leftOut: [], alwaysShowLink: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("link", { name: "Change what counts" })).toBeDefined();
  },
};
