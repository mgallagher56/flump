import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "@storybook/test";
import { MarginalRateExplorerStandalone } from "./MarginalRateExplorer";

const meta: Meta<typeof MarginalRateExplorerStandalone> = {
  title: "3. Calculators/MarginalRateExplorer",
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
    await expect(canvas.getByTestId("take-home-delta-sentence")).toHaveTextContent(
      "an estimated £720 is take-home",
    );
    // "Model a pension contribution" pre-fills the extra pension slider at £1,000.
    await userEvent.click(canvas.getByRole("button", { name: "Model a pension contribution" }));
    await waitFor(() =>
      expect(canvas.getByLabelText("Extra pension contribution input")).toHaveValue("£1,000"),
    );
    await expect(canvas.getByTestId("take-home-delta-pension")).toHaveTextContent(
      "An extra £1,000 a year into your pension",
    );
    // Region, pension type, student loans and the tax year sit under More details.
    await userEvent.click(canvas.getByRole("button", { name: "More details" }));
    await expect(canvas.getByLabelText("Where you pay tax")).toBeInTheDocument();
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
