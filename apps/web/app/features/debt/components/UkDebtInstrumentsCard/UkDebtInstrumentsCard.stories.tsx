import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "storybook/test";
import { UkDebtInstrumentsCard } from "./UkDebtInstrumentsCard";

const meta: Meta<typeof UkDebtInstrumentsCard> = {
  title: "3. Patterns/Debt/UkDebtInstrumentsCard",
  component: UkDebtInstrumentsCard,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof UkDebtInstrumentsCard>;

// The Storybook decorator renders light and dark side by side, so queries use the "all" variants.
export const ZeroPercentExpiry: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText("When the 0% deal ends").length).toBeGreaterThan(0);
    await expect(canvas.getAllByText(/are left on the 0% deal/).length).toBeGreaterThan(0);
  },
};

export const OverdraftCost: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getAllByRole("tab", { name: /Arranged overdraft cost/ })[0] as HTMLElement,
    );
    await expect(canvas.getAllByText(/a year$/).length).toBeGreaterThan(0);
  },
};

export const StudentLoan: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getAllByRole("tab", { name: /Student loan outlook/ })[0] as HTMLElement,
    );
    await expect(canvas.getAllByText(/in this estimate the balance is/).length).toBeGreaterThan(0);
  },
};
