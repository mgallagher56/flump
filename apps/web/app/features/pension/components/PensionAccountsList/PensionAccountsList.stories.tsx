import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "storybook/test";
import { PensionAccountsList } from "./PensionAccountsList";

const accounts = [
  {
    id: "p1",
    name: "Workplace pot",
    type: "Pension",
    balance: 3000,
    interestRate: 5,
    monthlyContribution: 0,
    isCurrent: true,
  },
  {
    id: "p2",
    name: "Old employer pot",
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
  args: { accounts },
};

export default meta;
type Story = StoryObj<typeof PensionAccountsList>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvasElement.querySelectorAll("[data-list-row]").length).toBeGreaterThan(1);
    await userEvent.click(
      canvas.getAllByRole("button", { name: "Edit Old employer pot" })[0] as HTMLElement,
    );
    await expect((await within(document.body).findAllByRole("dialog"))[0]).toBeDefined();
  },
};

// The Storybook decorator renders light and dark side by side, so queries use the first match.
export const ManyPots: Story = {
  args: {
    accounts: Array.from({ length: 10 }, (_, i) => ({
      id: `p${i}`,
      name: `Pot ${i + 1}`,
      type: "Pension",
      balance: 1000 * (i + 1),
      isCurrent: i < 2,
    })) as never[],
  },
};
