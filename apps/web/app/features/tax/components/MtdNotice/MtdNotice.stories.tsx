import { checkMtdQualifyingIncome, type TaxRecordFields } from "@flump/finance-engine";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "storybook/test";
import { mtdNoticeCopy } from "../../mtdNotice";
import { MtdNotice } from "./MtdNotice";

const income = (amount: number, date: string): TaxRecordFields => ({
  id: `se-${date}`,
  type: "income",
  source: "self-employed",
  category: "self_employed_income",
  name: "Invoices",
  amount,
  frequency: "annual",
  date,
  endDate: null,
  notes: null,
  accountId: null,
});

const overFor = (amount: number, date: string, taxYear: string) => {
  const check = checkMtdQualifyingIncome([income(amount, date)], taxYear, "2026-11-25");
  return check ? mtdNoticeCopy({ kind: "over", check }) : null;
};

/** The Storybook preview renders every story side by side in light and dark. */
const meta: Meta<typeof MtdNotice> = {
  title: "3. Patterns/Tax/MtdNotice",
  component: MtdNotice,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof MtdNotice>;

/** Recorded 2025 to 2026 income over £30,000: the 6 April 2027 group, detail closed. */
export const OverThreshold: Story = {
  args: { copy: overFor(31_000, "2025-06-01", "2025/26") },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/may apply to you from 6 April 2027/)).toBeTruthy();
    await expect(canvas.queryByText(/HMRC works this out/)).toBeNull();
  },
};

/** The same, with the detail open. */
export const OverThresholdDetailsOpen: Story = {
  args: { copy: overFor(31_000, "2025-06-01", "2025/26") },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Show details" }));
    await expect(canvas.getByText(/HMRC works this out/)).toBeTruthy();
    await expect(canvas.getByRole("link", { name: /Sign up on GOV.UK/ })).toBeTruthy();
  },
};

/** Recorded 2024 to 2025 income over £50,000: a start date already passed. */
export const OverThresholdStarted: Story = {
  args: { copy: overFor(52_000, "2024-06-01", "2024/25") },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/is over £50,000\./)).toBeTruthy();
    await expect(canvas.getByText(/may apply to you from 6 April 2026/)).toBeTruthy();
  },
};

/** Self-employed with nothing over a threshold yet: the general line. */
export const General: Story = {
  args: { copy: mtdNoticeCopy({ kind: "unknown" }) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("link", { name: /Check if you need to use it on GOV.UK/ }),
    ).toBeTruthy();
    await expect(canvas.queryByRole("button")).toBeNull();
  },
};
