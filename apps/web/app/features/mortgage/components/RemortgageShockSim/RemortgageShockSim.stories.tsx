import type { Meta, StoryObj } from "@storybook/react";
import { expect, fireEvent, within } from "storybook/test";
import { RemortgageShockSim } from "./RemortgageShockSim";

const meta: Meta<typeof RemortgageShockSim> = {
  title: "3. Financial Patterns & Sections/RemortgageShockSim",
  component: RemortgageShockSim,
  parameters: {
    layout: "padded",
  },
  args: {
    currentBalance: 280000,
    currentRate: 2.5,
    propertyValue: 350000,
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

export const NoPropertyValue: Story = {
  args: { propertyValue: undefined },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getAllByText(/Add your property value to see your loan to value/)[0],
    ).toBeInTheDocument();
  },
};

export const NotSet: Story = {
  args: { currentBalance: 0, currentRate: 0, propertyValue: undefined },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getAllByText(/Add your mortgage balance and property value/)[0],
    ).toBeInTheDocument();
  },
};
