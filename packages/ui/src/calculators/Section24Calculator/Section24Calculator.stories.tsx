import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";
import { SECTION24_COPY, Section24Calculator } from "./Section24Calculator";

const meta: Meta<typeof Section24Calculator> = {
  title: "5. Calculators/Section24Calculator",
  component: Section24Calculator,
  parameters: { layout: "padded" },
  args: { onSaveAndContinue: fn(), persistSeed: false },
};

export default meta;
type Story = StoryObj<typeof Section24Calculator>;

const play: Story["play"] = async ({ canvasElement, args }) => {
  const canvas = within(canvasElement);
  const outcomes = within(canvas.getByTestId("section-24-outcomes"));
  await expect(outcomes.getByText("£4,800")).toBeInTheDocument();

  // Typing in the rent pill recalculates the outcome.
  const rent = canvas.getByLabelText(`${SECTION24_COPY.rentalIncome} input`);
  await userEvent.clear(rent);
  await userEvent.type(rent, "30000");
  await userEvent.tab();
  await expect(await outcomes.findByText("£9,600")).toBeInTheDocument();

  // Other allowable costs sit under More options.
  await userEvent.click(
    canvas.getByRole("button", { name: new RegExp(SECTION24_COPY.moreOptions) }),
  );
  await expect(canvas.getByLabelText(SECTION24_COPY.allowableExpenses)).toBeInTheDocument();

  await userEvent.click(canvas.getByRole("button", { name: /Continue to sign up/ }));
  await expect(args.onSaveAndContinue).toHaveBeenCalledWith(
    expect.objectContaining({ annualIncome: 60000 }),
  );
};

export const Default: Story = { play };

export const Light: Story = { ...Default, globals: { theme: "light" } };

export const Dark: Story = { ...Default, globals: { theme: "dark" } };

export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: "mobile1" } },
};
