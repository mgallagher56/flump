import { figureKnown, figureUnknown, type HousingRoom } from "@flump/finance-engine";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { HousingRoomSummary } from "./HousingRoomSummary";

const meta: Meta<typeof HousingRoomSummary> = {
  title: "5. Calculators/Mortgage/HousingRoomSummary",
  component: HousingRoomSummary,
  parameters: {
    layout: "padded",
  },
  args: {
    includeSavings: false,
    includeOtherSpending: false,
    onIncludeSavingsChange: fn(),
    onIncludeOtherSpendingChange: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof HousingRoomSummary>;

export const Renter: Story = {
  args: {
    housingRoom: figureKnown<HousingRoom>(
      {
        monthly: 1500,
        takeHomeMonthly: 2600,
        essentialsWithoutHousing: 950,
        debtCommitment: 150,
        plannedSavings: 200,
        otherSpending: 400,
        includeSavings: false,
        includeOtherSpending: false,
        currentHousingMonthly: 900,
        currentHousingKind: "rent",
        currentHousingEstimated: false,
      },
      "derived",
    ),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Current rent")).toBeInTheDocument();
    await expect(canvas.getByText("£900 a month")).toBeInTheDocument();
    await userEvent.click(canvas.getByRole("switch", { name: "Subtract planned savings" }));
    await expect(args.onIncludeSavingsChange).toHaveBeenCalledWith(true);
  },
};

export const Homeowner: Story = {
  args: {
    housingRoom: figureKnown<HousingRoom>(
      {
        monthly: 1300,
        takeHomeMonthly: 3200,
        essentialsWithoutHousing: 1400,
        debtCommitment: 500,
        plannedSavings: 300,
        otherSpending: 250,
        includeSavings: true,
        includeOtherSpending: false,
        currentHousingMonthly: 1250,
        currentHousingKind: "mortgage",
        currentHousingEstimated: true,
      },
      "assumption",
    ),
    includeSavings: true,
  },
};

export const MissingDetails: Story = {
  args: {
    housingRoom: figureUnknown(["annualSalary", "budget"], "not-set"),
    onNavigate: fn(),
  },
};
