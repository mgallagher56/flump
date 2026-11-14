import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { TaxWidget } from "./TaxWidget";

const meta: Meta<typeof TaxWidget> = {
  title: "3. Financial Patterns & Sections/TaxWidget",
  component: TaxWidget,
  parameters: { layout: "padded" },
  args: { data: { estimatedTaxDue: 4400, recordsCount: 3 } },
};

export default meta;
type Story = StoryObj<typeof TaxWidget>;

export const Estimate: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getAllByText("£4,400")[0]).toBeDefined();
  },
};

export const NothingToEstimate: Story = {
  args: { data: { estimatedTaxDue: null, recordsCount: 0 } },
};
