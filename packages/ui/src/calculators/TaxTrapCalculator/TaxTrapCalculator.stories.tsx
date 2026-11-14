import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";
import { TAX_TRAP_COPY } from "./copy";
import { TaxTrapCalculator } from "./TaxTrapCalculator";

const meta: Meta<typeof TaxTrapCalculator> = {
  title: "5. Calculators/TaxTrapCalculator",
  component: TaxTrapCalculator,
  parameters: { layout: "padded" },
  args: { taxYear: "2026/27", persistSeed: false, onSaveAndContinue: fn() },
};

export default meta;
type Story = StoryObj<typeof TaxTrapCalculator>;

const play: Story["play"] = async ({ canvasElement, args }) => {
  const canvas = within(canvasElement);
  const table = canvas.getByRole("table", { name: TAX_TRAP_COPY.factsCaption });
  const before = table.textContent;

  // Typing in the contribution pill recalculates the figures.
  const contribution = canvas.getByLabelText(`${TAX_TRAP_COPY.contribution} input`);
  await userEvent.clear(contribution);
  await userEvent.type(contribution, "20000");
  await userEvent.tab();
  await expect(table.textContent).not.toBe(before);
  await expect(canvas.getByTestId("tax-trap-childcare-status")).toHaveTextContent(
    "£100,000 or less",
  );

  await userEvent.click(canvas.getByRole("button", { name: /Continue to sign up/ }));
  await expect(args.onSaveAndContinue).toHaveBeenCalledWith(
    expect.objectContaining({ annualIncome: 115000 }),
  );
};

export const Default: Story = { play };

export const Light: Story = { ...Default, globals: { theme: "light" } };

export const Dark: Story = { ...Default, globals: { theme: "dark" } };

export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: "mobile1" } },
};

export const Scotland: Story = { args: { initialRegion: "SCOTLAND" } };

export const NoContribution: Story = { args: { initialContribution: 0 } };
