import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";
import { ZERO_PERCENT_COPY, ZeroPercentCliffCalculator } from "./ZeroPercentCliffCalculator";

const meta: Meta<typeof ZeroPercentCliffCalculator> = {
  title: "5. Calculators/ZeroPercentCliffCalculator",
  component: ZeroPercentCliffCalculator,
  parameters: { layout: "padded" },
  args: { onSaveAndContinue: fn(), persistSeed: false },
};

export default meta;
type Story = StoryObj<typeof ZeroPercentCliffCalculator>;

const play: Story["play"] = async ({ canvasElement, args }) => {
  const canvas = within(canvasElement);
  const outcomes = within(canvas.getByTestId("zero-percent-outcomes"));
  await expect(outcomes.getByText("£200")).toBeInTheDocument();

  // Typing in the balance pill recalculates the outcome.
  const balance = canvas.getByLabelText(`${ZERO_PERCENT_COPY.balance} input`);
  await userEvent.clear(balance);
  await userEvent.type(balance, "4800");
  await userEvent.tab();
  await expect(await outcomes.findByText("£267")).toBeInTheDocument();

  await userEvent.click(canvas.getByRole("button", { name: /Continue to sign up/ }));
  await expect(args.onSaveAndContinue).toHaveBeenCalledWith(
    expect.objectContaining({ totalUnsecuredDebt: 4800 }),
  );
};

export const Default: Story = { play };

export const Light: Story = { ...Default, globals: { theme: "light" } };

export const Dark: Story = { ...Default, globals: { theme: "dark" } };

export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: "mobile1" } },
};
