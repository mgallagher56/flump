import { compareAvalancheAndSnowball, type DebtItem } from "@flump/finance-engine";
import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { PayExtraTool, type PayoffOrder } from "./PayExtraTool";

const debts: DebtItem[] = [
  { id: "cc", name: "Card", balance: 3000, apr: 22.9, minimumPayment: 90, type: "credit_card" },
  { id: "loan", name: "Loan", balance: 4500, apr: 7.9, minimumPayment: 150, type: "loan" },
];

const Stateful = ({ budgetLeftOver }: { budgetLeftOver: number | null }) => {
  const [extra, setExtra] = useState(0);
  const [order, setOrder] = useState<PayoffOrder>("avalanche");
  return (
    <PayExtraTool
      budgetLeftOver={budgetLeftOver}
      comparison={compareAvalancheAndSnowball(debts, extra)}
      extraPayment={extra}
      selectedStrategy={order}
      startBalance={7500}
      onChangeExtraPayment={setExtra}
      onSelectStrategy={setOrder}
    />
  );
};

const meta: Meta<typeof Stateful> = {
  title: "5. Calculators/Debt/PayExtraTool",
  component: Stateful,
  parameters: { layout: "padded" },
  args: { budgetLeftOver: 420 },
};

export default meta;
type Story = StoryObj<typeof Stateful>;

// The Storybook decorator renders light and dark side by side, so queries use the "all" variants.
export const UseLeftOver: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getAllByRole("button", { name: "Use the £420 left over" })[0] as HTMLElement,
    );
    await expect(canvas.getAllByText(/sooner/).length).toBeGreaterThan(0);
    // Once used, the button hides: the amount is not said again beside the outcome.
    await expect(canvas.queryAllByRole("button", { name: /left over/ })).toHaveLength(0);
    // With a change, the "Paid off" marker is drawn and a legend names the two lines.
    await expect(canvas.findAllByText("Paid off")).resolves.not.toHaveLength(0);
    await expect(canvas.findAllByRole("list", { name: "Chart key" })).resolves.not.toHaveLength(0);
  },
};

/** At £0 the zone shows a prompt, not a figure: the debt-free date is in the KPI strip. */
export const NoExtraPayment: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText("Move the slider to see what changes").length).toBeGreaterThan(
      0,
    );
    await expect(canvas.queryAllByText("Debt-free date").length).toBe(0);
    // No marker and no plot label at £0 extra: the KPI already gives the minimum-only date, and the
    // figure title names the one line.
    await waitFor(() =>
      expect(canvasElement.querySelectorAll(".recharts-line").length).toBeGreaterThan(0),
    );
    await expect(canvas.queryAllByText("Paid off").length).toBe(0);
    await expect(canvas.queryAllByText("Debt remaining").length).toBe(0);
    // Over two years, the x axis is labelled with years only.
    const ticks = Array.from(canvasElement.querySelectorAll(".recharts-xAxis text")).map(
      (t) => t.textContent ?? "",
    );
    for (const tick of ticks) await expect(tick).toMatch(/^\d{4}$/);
  },
};

/** Both orders clear these debts the same way, so one quiet line says so in place of the hint. */
export const SameResult: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getAllByText("Both orders give the same result for your debts.").length,
    ).toBeGreaterThan(0);
  },
};

export const NoBudget: Story = {
  args: { budgetLeftOver: null },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getAllByText("Set up your budget to see what you have left over each month").length,
    ).toBeGreaterThan(0);
  },
};
