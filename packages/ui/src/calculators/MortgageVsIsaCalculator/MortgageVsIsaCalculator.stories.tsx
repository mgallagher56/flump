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
  await expect(outcomes.getByText("£63,039")).toBeInTheDocument();

  // Typing in the extra-money pill recalculates the difference.
  const extra = canvas.getByLabelText(`${MORTGAGE_ISA_COPY.extra} input`);
  await userEvent.clear(extra);
  await userEvent.type(extra, "500");
  await userEvent.tab();
  await expect(await outcomes.findByText("£95,955")).toBeInTheDocument();

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

/** As on a tool page: the page shows the title and description, so the calculator does not. */
export const Embedded: Story = {
  args: { embedded: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByText(MORTGAGE_ISA_COPY.title)).not.toBeInTheDocument();
    // The working sits in a quiet drawer, closed by default.
    await expect(
      canvas.getByRole("button", { name: MORTGAGE_ISA_COPY.explainerTitle }),
    ).toHaveAttribute("aria-expanded", "false");
  },
};

export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: "mobile1" } },
};
