import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { sampleBudgetEntries } from "../../sampleBudgetEntries";
import { RunwayCalculator } from "./RunwayCalculator";

const meta: Meta<typeof RunwayCalculator> = {
  title: "5. Calculators/Budget/RunwayCalculator",
  component: RunwayCalculator,
  parameters: { layout: "padded" },
  args: {
    entries: sampleBudgetEntries().concat([
      {
        ...sampleBudgetEntries()[0],
        id: "i2",
        name: "Freelance writing",
        amount: 300,
        isPrimaryIncome: false,
      },
    ]),
    accounts: [
      { id: "a1", name: "Monzo current", type: "Current", balance: 3200, currency: "GBP" },
      { id: "a2", name: "Easy-access saver", type: "Saving", balance: 14300, currency: "GBP" },
      {
        id: "a3",
        name: "Stocks and shares ISA",
        type: "Investment",
        balance: 9800,
        currency: "GBP",
      },
    ],
    accountDetails: [],
    onNavigateToForecast: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof RunwayCalculator>;

// The Storybook decorator renders light and dark side by side, so queries use the first match.
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const toggle = canvas.getAllByRole("switch", {
      name: "Include Monzo current in this illustration",
    })[0];
    if (!toggle) throw new Error("Switch missing");
    await userEvent.click(toggle);
    await expect(toggle.getAttribute("aria-checked")).toBe("false");
  },
};
