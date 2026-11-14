import { Button } from "@repo/ui";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { ChartDataRow } from "./ChartDataRow";

const meta: Meta<typeof ChartDataRow> = {
  title: "4. Charts/ChartDataRow",
  component: ChartDataRow,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof ChartDataRow>;

const table = (
  <table aria-label="Balance by month">
    <thead>
      <tr>
        <th scope="col">Month</th>
        <th scope="col">Balance</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <th scope="row">October 2026</th>
        <td>£1,000</td>
      </tr>
    </tbody>
  </table>
);

/** Show data and one quiet link on one line; the table opens full width below. */
export const WithLink: Story = {
  args: {
    table,
    actions: (
      <Button size="sm" type="button" variant="link">
        Add earlier months
      </Button>
    ),
    note: "Next check-in: 1 December 2026",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const showData = canvas.getByRole("button", { name: "Show data" });
    const link = canvas.getByRole("button", { name: "Add earlier months" });
    // The link sits on the trigger's line.
    const a = showData.getBoundingClientRect();
    const b = link.getBoundingClientRect();
    await expect(Math.abs(a.top + a.height / 2 - (b.top + b.height / 2))).toBeLessThanOrEqual(2);
    await userEvent.click(showData);
    const opened = canvas.getByRole("table", { name: "Balance by month" });
    // waitFor lets the drawer's fade-in finish.
    await waitFor(() => expect(opened).toBeVisible());
    await expect(opened.getBoundingClientRect().top).toBeGreaterThanOrEqual(b.bottom - 1);
  },
};

export const Dark: Story = { ...WithLink, globals: { theme: "dark" } };
