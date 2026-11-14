import { figureKnown, figureUnknown, type HousingCost } from "@flump/finance-engine";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { HousingDetailsCard } from "./HousingDetailsCard";

const meta: Meta<typeof HousingDetailsCard> = {
  title: "3. Patterns/Budget/HousingDetailsCard",
  component: HousingDetailsCard,
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
    onSaveRent: fn().mockResolvedValue(undefined),
  },
};

export default meta;
type Story = StoryObj<typeof HousingDetailsCard>;

// The Storybook decorator renders light and dark side by side, so queries use the first match.
export const Saved: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const edit = canvas.getAllByRole("button", { name: "Edit your rent" })[0];
    if (!edit) throw new Error("Edit button missing");
    await userEvent.click(edit);
    await expect(
      within(canvasElement.ownerDocument.body).getAllByLabelText("Rent each month")[0],
    ).toBeDefined();
  },
};

export const NotSet: Story = {
  args: { housingCost: figureUnknown<HousingCost>(["monthlyHousingCost"]), savedRent: null },
};
