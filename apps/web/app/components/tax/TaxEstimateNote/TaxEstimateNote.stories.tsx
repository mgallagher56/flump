import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { TaxEstimateNote } from "./TaxEstimateNote";

const meta: Meta<typeof TaxEstimateNote> = {
  title: "3. Patterns/Tax/TaxEstimateNote",
  component: TaxEstimateNote,
  // The Storybook decorator renders every story side by side in Light and Dark by default.
  args: { taxYear: "2026/27" },
};

export default meta;
type Story = StoryObj<typeof TaxEstimateNote>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const [note] = await within(canvasElement).findAllByTestId("tax-estimate-note");
    await expect(note.textContent).toContain("Estimate for 2026/27");
  },
};

export const WithAssumption: Story = {
  args: { assumption: "Assumes a 4% drawdown rate." },
};
