import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { ChartFigure } from "./ChartFigure";

const meta: Meta<typeof ChartFigure> = {
  title: "3. Financial Patterns & Sections/ChartFigure",
  component: ChartFigure,
  parameters: { layout: "padded" },
  args: {
    title: "Savings forecast",
    summary: "Balance grows from £1,000 to £12,345 over 10 years at 4% annual growth.",
    showSummary: true,
    children: (
      <svg
        aria-hidden="true"
        focusable="false"
        height="120"
        role="presentation"
        viewBox="0 0 300 120"
        width="300"
      >
        <polyline
          fill="none"
          points="0,110 100,80 200,50 300,10"
          strokeWidth="3"
          stroke="currentColor"
        />
      </svg>
    ),
    dataTable: (
      <table>
        <caption>Balance by year</caption>
        <thead>
          <tr>
            <th scope="col">Year</th>
            <th scope="col">Balance</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">1</th>
            <td>£1,000</td>
          </tr>
          <tr>
            <th scope="row">10</th>
            <td>£12,345</td>
          </tr>
        </tbody>
      </table>
    ),
  },
};

export default meta;
type Story = StoryObj<typeof ChartFigure>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("figure", { name: "Savings forecast" })).toBeInTheDocument();
    await expect(canvas.getByText(/£12,345 over 10 years/)).toBeInTheDocument();
    await expect(canvas.queryByRole("table")).toBeNull();
    await userEvent.click(canvas.getByRole("button", { name: "Show data" }));
    await expect(canvas.getByRole("table")).toBeInTheDocument();
  },
};

export const Dark: Story = {
  ...Default,
  globals: { theme: "dark" },
};

export const HiddenSummary: Story = {
  args: { showSummary: false },
};

export const HiddenTitle: Story = {
  args: { hideTitle: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("figure", { name: "Savings forecast" })).toBeInTheDocument();
  },
};
