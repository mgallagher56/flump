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

/** As on a tool page: the page shows the title and description, so the calculator does not. */
export const Embedded: Story = {
  args: { embedded: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByText(SECTION24_COPY.title)).not.toBeInTheDocument();
    // No heading is left to skip a level: the explainer is a quiet drawer, closed by default.
    await expect(canvas.queryByRole("heading", { level: 3 })).not.toBeInTheDocument();
    const explainer = canvas.getByRole("button", { name: SECTION24_COPY.explainerTitle });
    await expect(explainer).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(explainer);
    await expect(explainer).toHaveAttribute("aria-expanded", "true");
  },
};

/** Under Section 24 tax can exceed the cash the property makes: the loss shows with a minus sign. */
export const CashLoss: Story = {
  args: { initialMortgageInterest: 13_000 },
  play: async ({ canvasElement }) => {
    const outcomes = within(within(canvasElement).getByTestId("section-24-outcomes"));
    await expect(outcomes.getByText("-£800")).toBeInTheDocument();
  },
};

export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: "mobile1" } },
};
