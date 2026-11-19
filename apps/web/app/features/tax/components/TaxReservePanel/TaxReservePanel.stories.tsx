import { calculateUKTax } from "@flump/finance-engine";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, within } from "storybook/test";
import { taxResultFixture } from "../../__fixtures__/taxRecords";
import { TaxReservePanel } from "./TaxReservePanel";

const rentalRecord = (
  category: string,
  amount: number,
): Parameters<typeof calculateUKTax>[1][number] => ({
  id: category,
  type: category === "rental_income" ? "income" : "expense",
  source: "rental",
  category,
  name: category,
  amount,
  frequency: "annual",
  date: "2026-06-06",
  endDate: null,
  notes: null,
});

/**
 * A Scottish starter-rate landlord, 2026/27: salary 13,000, rent 3,000, mortgage interest 3,000.
 * The 600 interest credit is more than the 570 tax on the rent, so 30 of PAYE tax is repaid.
 */
const repaymentResult = calculateUKTax(
  "2026/27",
  [rentalRecord("rental_income", 3000), rentalRecord("mortgage_interest", 3000)],
  13000,
  100,
  { region: "SCOTLAND" },
);

const meta: Meta<typeof TaxReservePanel> = {
  title: "3. Patterns/Tax/TaxReservePanel",
  component: TaxReservePanel,
  parameters: { layout: "padded" },
  args: {
    taxYear: "2026/27",
    result: taxResultFixture,
    totalIncome: 60_000,
    payeSalary: 52000,
    rentalShares: [{ accountId: "p1", name: "Flat 2", sharePercent: 50 }],
    onPayeSalaryChange: fn(),
    onSave: fn(),
    saving: false,
  },
};

export default meta;
type Story = StoryObj<typeof TaxReservePanel>;

const sharePlay: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByText("Flat 2. Your share: 50%, from Accounts")).toBeTruthy();
  await expect(canvas.queryByRole("textbox", { name: /share/i })).toBeNull();
};

const repaymentArgs = {
  result: repaymentResult,
  totalIncome: 16_000,
  payeSalary: 13000,
  rentalShares: [{ accountId: "p1", name: "Flat 2", sharePercent: 100 }],
};

const repaymentPlay: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(
    canvas.getByText(
      "The mortgage interest credit is more than the tax on your rent, so this estimate expects £30 of PAYE tax to be repaid.",
    ),
  ).toBeTruthy();
  await expect(canvas.getByText("Flat 2. Your share: 100%, from Accounts")).toBeTruthy();
  await expect(canvas.getByText("Estimated tax bill").closest("div")?.textContent).toContain("£0");
};

export const Light: Story = { globals: { theme: "light" }, play: sharePlay };

export const Dark: Story = { globals: { theme: "dark" }, play: sharePlay };

export const RepaymentLight: Story = {
  args: repaymentArgs,
  globals: { theme: "light" },
  play: repaymentPlay,
};

export const RepaymentDark: Story = {
  args: repaymentArgs,
  globals: { theme: "dark" },
  play: repaymentPlay,
};
