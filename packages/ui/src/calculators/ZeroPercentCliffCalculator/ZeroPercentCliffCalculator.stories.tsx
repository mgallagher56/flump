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

/** As on a tool page: the page shows the title and description, so the calculator does not. */
export const Embedded: Story = {
  args: { embedded: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByText(ZERO_PERCENT_COPY.title)).not.toBeInTheDocument();
    // No heading is left to skip a level: the explainer is a quiet drawer, closed by default.
    await expect(canvas.queryByRole("heading", { level: 3 })).not.toBeInTheDocument();
    const explainer = canvas.getByRole("button", { name: ZERO_PERCENT_COPY.explainerTitle });
    await expect(explainer).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(explainer);
    await expect(explainer).toHaveAttribute("aria-expanded", "true");
  },
};

export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: "mobile1" } },
};
