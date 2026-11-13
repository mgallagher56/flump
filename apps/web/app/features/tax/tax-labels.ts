import type { TaxRecord, TaxSource } from "@flump/finance-engine";

/** User-facing names for each income source, in the order the page lists them. */
export const SOURCE_OPTIONS: ReadonlyArray<{ value: TaxSource; label: string }> = [
  { value: "paye", label: "Employment (PAYE)" },
  { value: "rental", label: "Rental property" },
  { value: "self-employed", label: "Self-employed" },
  { value: "savings", label: "Savings and dividends" },
];

export const SOURCE_LABEL: Record<TaxSource, string> = Object.fromEntries(
  SOURCE_OPTIONS.map((o) => [o.value, o.label]),
) as Record<TaxSource, string>;

export const FREQUENCY_OPTIONS: ReadonlyArray<{ value: TaxRecord["frequency"]; label: string }> = [
  { value: "one-off", label: "One-off" },
  { value: "monthly", label: "Monthly" },
  { value: "annual", label: "Annual" },
];

export const FREQUENCY_LABEL: Record<TaxRecord["frequency"], string> = {
  "one-off": "One-off",
  monthly: "Monthly",
  annual: "Annual",
};

/** Amounts arrive as strings from TypeORM decimals; always hand the UI a number. */
export const recordAmount = (record: Pick<TaxRecord, "amount">): number =>
  typeof record.amount === "string" ? Number.parseFloat(record.amount) : record.amount;
