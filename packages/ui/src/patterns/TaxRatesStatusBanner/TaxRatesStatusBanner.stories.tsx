import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { TaxRatesStatusBanner } from "./TaxRatesStatusBanner";

const meta: Meta<typeof TaxRatesStatusBanner> = {
  title: "3. Patterns/TaxRatesStatusBanner",
  component: TaxRatesStatusBanner,
  parameters: { layout: "padded" },
  args: { calendarYear: "2027/28", ratesYear: "2026/27", isFallback: true },
};

export default meta;
type Story = StoryObj<typeof TaxRatesStatusBanner>;

export const Fallback: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/Using 2026\/27 rates/)).toBeInTheDocument();
    await userEvent.click(canvas.getByRole("button", { name: "Dismiss notice" }));
    await expect(canvas.queryByRole("status")).toBeNull();
  },
};

export const Provisional: Story = {
  args: { ratesYear: "2027/28", isFallback: false, kind: "provisional" },
};
