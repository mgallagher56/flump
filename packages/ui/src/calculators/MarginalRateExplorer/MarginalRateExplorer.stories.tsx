import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, waitFor, within } from "@storybook/test";
import { MarginalRateExplorerStandalone } from "./MarginalRateExplorer";

const meta: Meta<typeof MarginalRateExplorerStandalone> = {
  title: "5. Calculators/MarginalRateExplorer",
  component: MarginalRateExplorerStandalone,
  parameters: { layout: "padded" },
  // Pinned so the £720 check does not move with the calendar.
  args: { initialValues: { taxYear: "2026/27" } },
};

export default meta;
type Story = StoryObj<typeof MarginalRateExplorerStandalone>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Take-home shows in the headline card only; the table, in a closed drawer, lists the deductions.
    await userEvent.click(canvas.getByRole("button", { name: "Where the next £1,000 goes" }));
    await expect(
      within(canvas.getByRole("table", { name: "Where the next £1,000 goes" })).queryByText("£720"),
    ).not.toBeInTheDocument();
    // Region, pension type, student loans, the tax year and the extra pension sit under More options.
    await userEvent.click(canvas.getByRole("button", { name: "More options" }));
    await expect(canvas.getByLabelText("Where you pay tax")).toBeInTheDocument();
    // "Model a pension contribution" pre-fills the extra pension slider at £1,000.
    await userEvent.click(canvas.getByRole("button", { name: "Model a pension contribution" }));
    await waitFor(() =>
      expect(canvas.getByLabelText("Extra pension contribution input")).toHaveValue("£1,000"),
    );
    await expect(canvas.getByTestId("take-home-delta-pension")).toHaveTextContent(
      "An extra £1,000 a year into your pension",
    );
  },
};

/** On a tool page: section headings are h2 and the sign-up button sits under the result. */
export const Embedded: Story = {
  args: {
    embedded: true,
    ctaText: "Request an invite",
    onSaveAndContinue: fn(),
    persistSeed: false,
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("heading", {
        level: 2,
        name: "Estimated share deducted from the next £1,000, by pay",
      }),
    ).toBeInTheDocument();
    // One tax year badge, at the top of the results.
    await expect(canvas.getAllByText(/^As at tax year/)).toHaveLength(1);
    await userEvent.click(canvas.getByRole("button", { name: "Request an invite" }));
    await expect(args.onSaveAndContinue).toHaveBeenCalledWith(
      expect.objectContaining({ annualIncome: 39_000 }),
    );
  },
};

/** A date in a tax year with no rates yet: the panel says which year's rates are used. */
export const FallbackRates: Story = {
  args: { initialValues: undefined, now: new Date(Date.UTC(2040, 5, 1)) },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByTestId("tax-rates-status-banner")).toBeInTheDocument();
  },
};

export const HigherEarnerWithChildBenefit: Story = {
  args: {
    initialValues: {
      taxYear: "2026/27",
      grossPay: 65_000,
      childBenefit: true,
      children: 2,
      studentLoans: "plan2",
    },
  },
};

export const Scotland: Story = {
  args: { initialValues: { taxYear: "2026/27", region: "SCOTLAND", grossPay: 45_000 } },
};

export const Light: Story = { ...Default, globals: { theme: "light" } };

export const Dark: Story = { ...Default, globals: { theme: "dark" } };

export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: "mobile1" } },
};
