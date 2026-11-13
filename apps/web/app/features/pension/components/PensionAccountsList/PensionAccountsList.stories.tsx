import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { PensionAccountsList } from "./PensionAccountsList";

const accounts = [
  {
    id: "p1",
    name: "Nest Workplace Pension",
    type: "Pension",
    balance: 3000,
    interestRate: 5,
    monthlyContribution: 0,
    isCurrent: true,
  },
  {
    id: "p2",
    name: "Aviva Old Employer Pot",
    type: "Pension",
    balance: 27000,
    interestRate: 6,
    monthlyContribution: 0,
    isCurrent: false,
  },
] as never[];

const meta: Meta<typeof PensionAccountsList> = {
  title: "3. Financial Patterns & Sections/PensionAccountsList",
  component: PensionAccountsList,
  parameters: { layout: "padded" },
  args: { accounts, onOpenAddModal: fn(), variant: "desktop" },
};

export default meta;
type Story = StoryObj<typeof PensionAccountsList>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Pot allocation")).toBeDefined();
    await userEvent.click(canvas.getByRole("button", { name: "Edit Aviva Old Employer Pot" }));
    await expect(await within(document.body).findByRole("dialog")).toBeDefined();
  },
};

export const Mobile: Story = { args: { variant: "mobile" } };

export const Empty: Story = { args: { accounts: [] } };
