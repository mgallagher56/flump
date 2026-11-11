import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { PayoffStrategyControls } from "./PayoffStrategyControls";

const meta: Meta<typeof PayoffStrategyControls> = {
  title: "3. Financial Patterns & Sections/PayoffStrategyControls",
  component: PayoffStrategyControls,
  parameters: {
    layout: "centered",
  },
  args: {
    selectedStrategy: "avalanche",
    extraPayment: 50,
    onSelectStrategy: fn(),
    onChangeExtraPayment: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof PayoffStrategyControls>;

export const Default: Story = {
  // E8 waiver: label-content-name-mismatch
  parameters: { a11y: { test: "todo" } },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const snowballBtn = canvas.getByRole("button", { name: "Select Snowball strategy" });
    await expect(snowballBtn).toBeInTheDocument();
    await userEvent.click(snowballBtn);
    await expect(args.onSelectStrategy).toHaveBeenCalledWith("snowball");
  },
};

export const WithSavings: Story = {
  // E8 waiver: label-content-name-mismatch
  parameters: { a11y: { test: "todo" } },
  args: { interestSaved: 2140, monthsSaved: 14 },
};
