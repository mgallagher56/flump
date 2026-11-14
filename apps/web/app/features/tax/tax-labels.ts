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
  { value: "annual", label: "Yearly" },
];

export const FREQUENCY_LABEL: Record<TaxRecord["frequency"], string> = {
  "one-off": "One-off",
  monthly: "Monthly",
  annual: "Yearly",
};

/** Amounts arrive as strings from TypeORM decimals; always hand the UI a number. */
export const recordAmount = (record: Pick<TaxRecord, "amount">): number =>
  typeof record.amount === "string" ? Number.parseFloat(record.amount) : record.amount;

/**
 * Short names for the record dialog's category list, so no option truncates at 375px (R2-8). The
 * saved value is still the category id; finance-engine keeps the long HMRC-style names.
 */
export const CATEGORY_SHORT_LABEL: Readonly<Record<string, string>> = {
  rental_income: "Rental income",
  rent_rates_insurance: "Rent, rates and insurance",
  legal_management_fees: "Legal and management fees",
  repairs_maintenance: "Repairs and maintenance",
  replace_domestic_items: "Replacing household items",
  services_costs: "Services provided",
  mortgage_interest: "Mortgage interest",
  self_employed_income: "Business income",
  office_costs: "Office, phone and internet",
  travel_costs: "Vehicle and travel",
  clothing_costs: "Uniforms and workwear",
  staff_costs: "Staff and subcontractors",
  premises_costs: "Premises costs",
  legal_finance_fees: "Accountant, legal and bank fees",
  advertising_marketing: "Advertising and website",
  stock_raw_materials: "Stock and materials",
  other_expenses: "Other business costs",
  paye_salary: "Salary",
  paye_bonus: "Bonus and overtime",
  paye_benefit: "Taxable benefits (P11D)",
  paye_pension: "Pension contributions",
  savings_interest: "Savings interest",
  dividend_income: "Dividends",
  isa_interest: "ISA interest (tax-free)",
  investment_fees: "Investment fees",
};

/** The dialog's name for a category, falling back to the engine's name for an unknown id. */
export const categoryShortLabel = (category: { id: string; name: string }): string =>
  CATEGORY_SHORT_LABEL[category.id] ?? category.name;
