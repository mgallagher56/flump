import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";
import { DEBT_SNOWBALL_COPY, DebtSnowballCalculator } from "./DebtSnowballCalculator";

const meta: Meta<typeof DebtSnowballCalculator> = {
  title: "3. Calculators/DebtSnowballCalculator",
  component: DebtSnowballCalculator,
  parameters: { layout: "padded" },
  args: { onSaveAndContinue: fn(), persistSeed: false },
};

export default meta;
type Story = StoryObj<typeof DebtSnowballCalculator>;

const play: Story["play"] = async ({ canvasElement, args }) => {
  const canvas = within(canvasElement);
  const outcomes = within(canvas.getByTestId("debt-snowball-outcomes"));
  await expect(outcomes.getAllByText("£1,900")).toHaveLength(2);

  // Typing in the extra payment pill recalculates both methods.
  const extra = canvas.getByLabelText(`${DEBT_SNOWBALL_COPY.extra} input`);
  await userEvent.clear(extra);
  await userEvent.type(extra, "500");
  await userEvent.tab();
  await expect(await outcomes.findAllByText("£597")).toHaveLength(2);

  await userEvent.click(canvas.getByRole("button", { name: /Continue to sign up/ }));
  await expect(args.onSaveAndContinue).toHaveBeenCalledWith(
    expect.objectContaining({ totalUnsecuredDebt: 8500 }),
  );
};

export const Default: Story = { play };

export const Light: Story = { ...Default, globals: { theme: "light" } };

export const Dark: Story = { ...Default, globals: { theme: "dark" } };

/** Phone width: each debt's fields wrap, so nothing scrolls sideways (known #10). */
export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: "mobile1" } },
  play: async ({ canvasElement }) => {
    const tool = within(canvasElement).getByTestId("debt-snowball-tool");
    await expect(tool.scrollWidth).toBeLessThanOrEqual(tool.clientWidth);
  },
};
