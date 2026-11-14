import type { Meta, StoryObj } from "@storybook/react";
import { expect, fireEvent, within } from "storybook/test";
import { RemortgageShockSim } from "./RemortgageShockSim";

const meta: Meta<typeof RemortgageShockSim> = {
  title: "5. Calculators/Mortgage/RemortgageShockSim",
  component: RemortgageShockSim,
  parameters: {
    layout: "padded",
  },
  args: {
    currentBalance: 280000,
    currentRate: 2.5,
  },
};

export default meta;
type Story = StoryObj<typeof RemortgageShockSim>;

export const Populated: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText(/Change in monthly payment/)[0]).toBeInTheDocument();
    const [slider] = canvas.getAllByLabelText("Rate after your fixed rate ends");
    fireEvent.change(slider as HTMLElement, { target: { value: "7" } });
    await expect(canvas.getAllByLabelText("Rate after your fixed rate ends")[0]).toHaveValue("7");
  },
};

export const SavedPayment: Story = {
  args: {
    currentBalance: 186000,
    currentRate: 4.5,
    currentPayment: 1250,
    currentPaymentIsSaved: true,
    fixEndDate: "2028-07-01",
    remainingTermYears: 218 / 12,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText(/a month from Jul 2028/)[0]).toBeInTheDocument();
    await expect(canvas.getAllByText("Current payment")[0]).toBeInTheDocument();
  },
};

export const NotSet: Story = {
  args: { currentBalance: 0, currentRate: 0 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText(/Add your balance and interest rate/)[0]).toBeInTheDocument();
    await expect(canvas.queryByRole("button", { name: "More options" })).toBeNull();
  },
};
