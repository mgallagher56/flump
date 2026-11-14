import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { css } from "../../../styled-system/css";
import { formatMoney } from "../Money/Money";
import { CollapsibleDrawer } from "./CollapsibleDrawer";

const wrap = css({ width: "min(640px, 92vw)" });
const table = css({
  width: "100%",
  borderCollapse: "collapse",
  fontVariantNumeric: "tabular-nums",
  textStyle: "body.sm",
  color: "text.primary",
  "& th": { textAlign: "right", color: "text.secondary", pb: "2" },
  "& td": { textAlign: "right", py: "1.5", borderTopWidth: "1px", borderColor: "border.subtle" },
  "& th:first-child, & td:first-child": { textAlign: "left" },
});

const rows = Array.from({ length: 12 }, (_, i) => ({
  month: i + 1,
  capital: 450 + i * 3,
  interest: 85 - i,
  remaining: 14200 - (i + 1) * 450,
}));

const Ledger = () => (
  <table className={table}>
    <thead>
      <tr>
        <th scope="col">Month</th>
        <th scope="col">Capital</th>
        <th scope="col">Interest</th>
        <th scope="col">Remaining</th>
      </tr>
    </thead>
    <tbody>
      {rows.map((r) => (
        <tr key={r.month}>
          <td>{r.month}</td>
          <td>{formatMoney(r.capital).text}</td>
          <td>{formatMoney(r.interest).text}</td>
          <td>{formatMoney(r.remaining).text}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

const meta: Meta<typeof CollapsibleDrawer> = {
  title: "2. Primitives/CollapsibleDrawer",
  component: CollapsibleDrawer,
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <div className={wrap}>
        <Story />
      </div>
    ),
  ],
  args: {
    title: "Repayment schedule",
    subtitle: "Month-by-month capital and interest",
    itemCount: 12,
    children: <Ledger />,
  },
};

export default meta;
type Story = StoryObj<typeof CollapsibleDrawer>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole("button", { name: /repayment schedule/i });
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(canvas.getByText("12 rows")).toBeInTheDocument();
    await expect(canvas.queryByRole("table")).toBeNull();

    await userEvent.click(trigger);
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(canvas.getByRole("table")).toBeInTheDocument();
  },
};

export const KeyboardToggle: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole("button", { name: /repayment schedule/i });
    trigger.focus();
    await userEvent.keyboard("{Enter}");
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await userEvent.keyboard(" ");
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
  },
};

export const OpenByDefault: Story = { args: { defaultOpen: true } };

export const LongSchedule: Story = {
  args: {
    title: "Full amortisation schedule for the whole mortgage term",
    subtitle: "Every monthly payment until the balance reaches zero",
    itemCount: 300,
  },
};

export const SingleItem: Story = {
  args: { itemCount: 1, itemNoun: { one: "year", other: "years" } },
};

/** Quiet: a text button for secondary detail under a chart or figure ("Show data"). */
export const Quiet: Story = {
  args: { variant: "quiet", title: "Show data", subtitle: undefined, itemCount: undefined },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole("button", { name: "Show data" });
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(canvas.queryByRole("table")).toBeNull();
    await userEvent.click(trigger);
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(canvas.getByRole("table")).toBeInTheDocument();
    // The name does not change while open; aria-expanded carries the state.
    await expect(canvas.getByRole("button", { name: "Show data" })).toBe(trigger);
  },
};

export const QuietOpenDark: Story = {
  args: { variant: "quiet", title: "Show details", subtitle: undefined, defaultOpen: true },
  globals: { theme: "dark" },
};
