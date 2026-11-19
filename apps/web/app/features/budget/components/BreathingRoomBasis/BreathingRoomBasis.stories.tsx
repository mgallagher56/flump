import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { sampleBudgetEntries } from "../../sampleBudgetEntries";
import { BreathingRoomBasis } from "./BreathingRoomBasis";

const meta: Meta<typeof BreathingRoomBasis> = {
  title: "5. Calculators/Budget/BreathingRoomBasis",
  component: BreathingRoomBasis,
  parameters: { layout: "padded" },
  args: {
    entries: sampleBudgetEntries(),
    accounts: [
      { id: "a1", name: "Monzo current", type: "Current", balance: 3200 },
      { id: "a2", name: "Easy-access saver", type: "Saving", balance: 14300 },
      { id: "a3", name: "Stocks and shares ISA", type: "Investment", balance: 9800 },
    ],
    accountDetails: [],
    onSetEssential: fn(async () => undefined),
  },
};

export default meta;
type Story = StoryObj<typeof BreathingRoomBasis>;

// The Storybook decorator renders light and dark side by side, so queries use the first match.
export const Default: Story = {};

export const Open: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getAllByRole("button", { name: /What Breathing room counts/ })[0]);
    await expect(
      canvas.getAllByRole("region", { name: "Accounts it draws on" })[0],
    ).toBeInTheDocument();
    const switches = canvas.getAllByRole("switch");
    const free = switches.find((s) => !(s as HTMLInputElement).disabled);
    if (free) {
      await userEvent.click(free);
      await expect(args.onSetEssential).toHaveBeenCalled();
    }
  },
};
