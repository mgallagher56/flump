import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";
import { MORTGAGE_ISA_COPY, MortgageVsIsaCalculator } from "./MortgageVsIsaCalculator";

const meta: Meta<typeof MortgageVsIsaCalculator> = {
  title: "5. Calculators/MortgageVsIsaCalculator",
  component: MortgageVsIsaCalculator,
  parameters: { layout: "padded" },
  args: { onSaveAndContinue: fn(), persistSeed: false },
};

export default meta;
type Story = StoryObj<typeof MortgageVsIsaCalculator>;

const play: Story["play"] = async ({ canvasElement, args }) => {
  const canvas = within(canvasElement);
  const outcomes = within(canvas.getByTestId("mortgage-isa-outcomes"));
  await expect(outcomes.getByText("£84,000")).toBeInTheDocument();

  // Typing in the extra-money pill recalculates the amount set aside.
  const extra = canvas.getByLabelText(`${MORTGAGE_ISA_COPY.extra} input`);
  await userEvent.clear(extra);
  await userEvent.type(extra, "500");
  await userEvent.tab();
  await expect(await outcomes.findByText("£120,000")).toBeInTheDocument();

  // The years left and the assumed ISA growth sit under More options.
  await userEvent.click(canvas.getByRole("button", { name: MORTGAGE_ISA_COPY.moreOptions }));
  await expect(canvas.getByLabelText(`${MORTGAGE_ISA_COPY.term} input`)).toBeInTheDocument();

  await userEvent.click(canvas.getByRole("button", { name: /Continue to sign up/ }));
  await expect(args.onSaveAndContinue).toHaveBeenCalledWith(
    expect.objectContaining({ monthlyContribution: 500 }),
  );
};

export const Default: Story = { play };

export const Light: Story = { ...Default, globals: { theme: "light" } };

export const Dark: Story = { ...Default, globals: { theme: "dark" } };

export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: "mobile1" } },
};
