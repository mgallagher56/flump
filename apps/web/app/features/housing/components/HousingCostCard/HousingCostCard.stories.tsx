import { figureKnown, figureUnknown, type HousingCost } from "@flump/finance-engine";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { HousingCostCard } from "./HousingCostCard";

const meta: Meta<typeof HousingCostCard> = {
  title: "3. Patterns/Housing/HousingCostCard",
  component: HousingCostCard,
  parameters: { layout: "padded" },
  args: {
    housingCost: figureKnown<HousingCost>(
      {
        kind: "rent",
        monthly: 900,
        takeHomeMonthly: 2700,
        sharePct: 33.3,
        paymentEstimated: false,
      },
      "user",
    ),
    savedRent: 900,
    onSaveRent: fn(async () => {}),
  },
};

export default meta;
type Story = StoryObj<typeof HousingCostCard>;

// The Storybook decorator renders light and dark side by side, so queries use the first match.
export const Renting: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getAllByText("33.3% of your estimated take-home pay").length,
    ).toBeGreaterThan(0);
    const save = canvas.getAllByRole("button", { name: "Save rent" })[0];
    if (!save) throw new Error("Save rent button missing");
    await userEvent.click(save);
    await expect(args.onSaveRent).toHaveBeenCalledWith(900);
  },
};

export const RentNotKnown: Story = {
  args: {
    housingCost: figureUnknown(["housingStatus"], "not-set"),
    savedRent: null,
  },
};

export const SalaryNotKnown: Story = {
  args: {
    housingCost: figureUnknown(["annualSalary"], "not-set"),
  },
};

export const MortgageEstimate: Story = {
  args: {
    housingCost: figureKnown<HousingCost>(
      {
        kind: "mortgage",
        monthly: 1111.66,
        takeHomeMonthly: 3200,
        sharePct: 34.7,
        paymentEstimated: true,
      },
      "assumption",
    ),
    fixedRateEnd: { date: "2027-05-14", monthsRemaining: 6, ended: false },
    onSaveRent: undefined,
  },
};

export const MortgageNotKnown: Story = {
  args: {
    housingCost: figureUnknown(["mortgageDetails"], "not-set"),
    fixedRateEnd: { date: "2026-10-01", monthsRemaining: 0, ended: true },
    onSaveRent: undefined,
  },
};

export const Dark: Story = { ...MortgageEstimate, globals: { theme: "dark" } };
