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
  // The headline card is the first outcome card.
  const headline = canvas.getByTestId("tax-trap-outcomes").children[0] as HTMLElement;
  const headlineBefore = headline.textContent;
  await expect(canvas.getByText("As at tax year 2026/27")).toBeInTheDocument();

  // The table, taper and childcare text sit behind "Show details".
  await userEvent.click(canvas.getByRole("button", { name: TAX_TRAP_COPY.details }));
  const table = canvas.getByRole("table", { name: TAX_TRAP_COPY.factsCaption });
  const before = table.textContent;

  // Typing in the contribution pill recalculates the figures.
  const contribution = canvas.getByLabelText(`${TAX_TRAP_COPY.contribution} input`);
  await userEvent.clear(contribution);
  await userEvent.type(contribution, "20000");
  await userEvent.tab();
  await expect(table.textContent).not.toBe(before);
  await expect(headline.textContent).not.toBe(headlineBefore);
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

/** On a tool page: the page shows the title, so the calculator leaves out its own. */
export const Embedded: Story = {
  args: { embedded: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByText(TAX_TRAP_COPY.title)).not.toBeInTheDocument();
  },
};

/** A date in a tax year with no rates yet: the banner says which year's rates are used. */
export const FallbackRates: Story = {
  args: { taxYear: undefined, now: new Date(Date.UTC(2040, 5, 1)) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId("tax-rates-status-banner")).toBeInTheDocument();
  },
};

export const Scotland: Story = { args: { initialRegion: "SCOTLAND" } };

export const NoContribution: Story = { args: { initialContribution: 0 } };
