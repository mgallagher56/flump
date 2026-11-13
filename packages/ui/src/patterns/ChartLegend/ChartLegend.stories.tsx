import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { css } from "../../../styled-system/css";
import { ChartLegend } from "./ChartLegend";

const meta: Meta<typeof ChartLegend> = {
  title: "3. Financial Patterns & Sections/ChartLegend",
  component: ChartLegend,
  parameters: { layout: "padded" },
  args: {
    items: [
      { id: "assets", label: "Net worth", color: "primary", swatch: "line" },
      { id: "savings", label: "Savings", color: "wealth", swatch: "area" },
      { id: "debt", label: "Debt", color: "debt", swatch: "line" },
      { id: "projection", label: "Projection", color: "projection", swatch: "dashed" },
    ],
  },
};

export default meta;
type Story = StoryObj<typeof ChartLegend>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const list = canvas.getByRole("list", { name: "Chart key" });
    await expect(within(list).getAllByRole("listitem")).toHaveLength(4);
    // The dashed swatch is how a projection is told apart without colour.
    await expect(canvasElement.querySelector("[data-swatch='dashed']")).not.toBeNull();
    await expect(canvas.getByText("Projection")).toBeInTheDocument();
  },
};

export const WithValues: Story = {
  args: {
    items: [
      { id: "assets", label: "Net worth", color: "primary", value: 48250 },
      { id: "savings", label: "Savings", color: "wealth", swatch: "area", value: 14300 },
      { id: "debt", label: "Debt", color: "debt", value: -6200.5 },
      { id: "pension", label: "Pension", color: "accentPurple", value: null },
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("£48,250")).toBeInTheDocument();
    await expect(canvas.getByText("Not set")).toBeInTheDocument();
  },
};

export const Vertical: Story = {
  args: { direction: "vertical" },
};

export const ManySeriesWrap: Story = {
  decorators: [
    (Story) => (
      <div className={css({ maxWidth: "360px" })}>
        <Story />
      </div>
    ),
  ],
  args: {
    items: [
      { id: "s1", label: "Easy-access saver at a long provider name", color: "series1" },
      { id: "s2", label: "Workplace pension (Aviva)", color: "series2", swatch: "area" },
      { id: "s3", label: "Stocks and shares ISA", color: "series3" },
      { id: "s4", label: "Premium bonds", color: "series4" },
      { id: "s5", label: "Projected house price", color: "series5", swatch: "dashed" },
    ],
  },
};
