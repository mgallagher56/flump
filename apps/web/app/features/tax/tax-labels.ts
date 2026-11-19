import { getCategoriesForSource, type TaxRecord, type TaxSource } from "@flump/finance-engine";

/**
 * SA-3: a plain fact for a Scottish taxpayer, folded into the page's one notice (audit slice 2).
 * The estimate itself is unchanged: it uses England, Wales and Northern Ireland bands. Whether
 * Scottish bands enter the calculation is owner decision 7, still open.
 */
export const SCOTTISH_BANDS_NOTE =
  "Your tax region is Scotland. This estimate uses England, Wales and Northern Ireland Income Tax bands, so your bill may differ.";

/** The Self Assessment estimate's missing facts that a person can add (estimateInputsFor). */
export type EstimateMissingFact = "annualSalary" | "selfEmploymentRecords";

/**
 * One plain prompt per missing fact, shown where the estimate would be (PR 785 review). The
 * estimate is unknown, never worked out from a stand-in £0, until the fact is added. Owner
 * decision 15, option A: the salary field is pay from an employer only, so a self-employed
 * person adds their self-employed income records instead.
 */
export const ESTIMATE_MISSING_PROMPT: Record<
  EstimateMissingFact,
  { prompt: string; actionLabel: string }
> = {
  annualSalary: {
    prompt:
      "Add your salary to see an estimated tax bill. It decides the tax band your other income falls in.",
    actionLabel: "Add salary",
  },
  selfEmploymentRecords: {
    prompt: "Add your self-employed income for this tax year to see an estimated tax bill.",
    actionLabel: "Add self-employed income",
  },
};

/** Where the salary is saved. */
export const SALARY_SETTINGS_PATH = "/app/profile#settings-age-and-pay";

/** The first missing fact a person can add, or null when the list holds none. */
export const addableEstimateFact = (
  missing: readonly string[] | null | undefined,
): EstimateMissingFact | null =>
  (missing ?? []).find(
    (m): m is EstimateMissingFact => m === "annualSalary" || m === "selfEmploymentRecords",
  ) ?? null;

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
  finance_costs_brought_forward: "Interest brought forward",
  self_employed_income: "Business income",
  office_costs: "Office, phone and internet",
  travel_costs: "Vehicle and travel",
  clothing_costs: "Uniforms and workwear",
  staff_costs: "Staff and subcontractors",
  premises_costs: "Premises expenses",
  legal_finance_fees: "Accountant, legal and bank fees",
  advertising_marketing: "Advertising and website",
  stock_raw_materials: "Stock and materials",
  other_expenses: "Other business expenses",
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
/** One plain sentence under the category, where a category needs one. */
export const CATEGORY_HINT: Readonly<Record<string, string>> = {
  finance_costs_brought_forward:
    "Enter the unused residential finance costs from last year's tax return or calculation.",
};

export const categoryShortLabel = (category: { id: string; name: string }): string =>
  CATEGORY_SHORT_LABEL[category.id] ?? category.name;

/** The PAYE salary category. New records cannot choose it: see `selectableCategories`. */
export const PAYE_SALARY_CATEGORY = "paye_salary";

/**
 * The categories a record can choose. The saved profile salary is the one salary figure, so a new
 * PAYE record cannot be salary; it is a bonus, benefit or pension contribution on top. A record
 * already saved as salary keeps its category (`currentCategory`), so it can still be changed or
 * deleted and no saved data is dropped.
 */
export const selectableCategories = (
  source: TaxSource,
  type: "income" | "expense",
  currentCategory?: string,
) =>
  getCategoriesForSource(source, type).filter(
    (c) => c.id !== PAYE_SALARY_CATEGORY || c.id === currentCategory,
  );
