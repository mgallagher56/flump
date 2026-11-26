import { payRiseResult } from "../../src/components/PayRiseTeaser/payRise";
import type { MoneyAreaKey } from "../../src/utils/featureAreas";

/**
 * Sample figures for the five-area stepper. Made up for the prototype and shown under "Example";
 * the pay figure is the engine's own pay rise result for the teaser's default salary and rise.
 * No status colours: every figure is shown in the same neutral text.
 */
export interface SampleFigure {
  label: string;
  value: number;
  suffix?: string;
}

const payRise = payRiseResult(39_000, 2_000);

export const AREA_SAMPLES: Record<MoneyAreaKey, readonly SampleFigure[]> = {
  accounts: [
    { label: "Current account", value: 1_840 },
    { label: "Easy access savings", value: 6_200 },
    { label: "Credit card balance", value: 420 },
  ],
  budget: [
    { label: "Comes in each month", value: 2_650 },
    { label: "Goes out each month", value: 2_180 },
    { label: "Left over each month", value: 470 },
  ],
  pay: [
    { label: "Salary before tax", value: 39_000, suffix: "a year" },
    { label: "Pay rise", value: 2_000, suffix: "a year" },
    { label: "You keep each month", value: Math.round(payRise.keptMonthly) },
  ],
  "savings-and-pension": [
    { label: "Pension pot", value: 18_500 },
    { label: "Paid in each month", value: 260 },
    { label: "Savings goal", value: 5_000 },
  ],
  "debt-and-borrowing": [
    { label: "Car loan left to pay", value: 4_200 },
    { label: "Monthly payment", value: 185 },
    { label: "Student loan balance", value: 21_400 },
  ],
};

const gbp = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

export const formatGbp = (value: number) => gbp.format(value);
