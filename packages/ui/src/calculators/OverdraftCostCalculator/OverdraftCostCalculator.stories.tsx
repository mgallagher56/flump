import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";
import { OVERDRAFT_COPY, OverdraftCostCalculator } from "./OverdraftCostCalculator";

const meta: Meta<typeof OverdraftCostCalculator> = {
  title: "5. Calculators/OverdraftCostCalculator",
  component: OverdraftCostCalculator,
  parameters: { layout: "padded" },
  args: { onSaveAndContinue: fn(), persistSeed: false },
};

export default meta;
type Story = StoryObj<typeof OverdraftCostCalculator>;

const play: Story["play"] = async ({ canvasElement, args }) => {
  const canvas = within(canvasElement);
  const outcomes = within(canvas.getByTestId("overdraft-outcomes"));
  await expect(outcomes.getByText("£479")).toBeInTheDocument();

  // Typing in the balance pill recalculates the outcome.
  const balance = canvas.getByLabelText(`${OVERDRAFT_COPY.balance} input`);
  await userEvent.clear(balance);
  await userEvent.type(balance, "2000");
  await userEvent.tab();
  await expect(await outcomes.findByText("£798")).toBeInTheDocument();

  await userEvent.click(canvas.getByRole("button", { name: /Continue to sign up/ }));
  await expect(args.onSaveAndContinue).toHaveBeenCalledWith(
    expect.objectContaining({ totalUnsecuredDebt: 2000 }),
  );
};

export const Default: Story = { play };

export const Light: Story = { ...Default, globals: { theme: "light" } };

export const Dark: Story = { ...Default, globals: { theme: "dark" } };

/** As on a tool page: the page shows the title and description, so the calculator does not. */
export const Embedded: Story = {
  args: { embedded: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByText(OVERDRAFT_COPY.title)).not.toBeInTheDocument();
    // The working sits in a closed quiet drawer.
    await expect(
      canvas.getByRole("button", { name: OVERDRAFT_COPY.explainerTitle }),
    ).toHaveAttribute("aria-expanded", "false");
  },
};

export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: "mobile1" } },
};
