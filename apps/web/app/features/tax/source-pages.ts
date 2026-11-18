import { isSupportedUkTaxYear, type TaxSource } from "@flump/finance-engine";

/** The income sources with their own page, in the order the list page shows them. */
export const SOURCE_PAGE_ORDER = ["self-employed", "rental", "savings", "paye"] as const;

export const isSourcePageSource = (value: string | undefined): value is TaxSource =>
  (SOURCE_PAGE_ORDER as readonly string[]).includes(value ?? "");

/** "2026/27" as it sits in a URL: "2026-27". A tax year, never money, so it may go in a link. */
export const taxYearToParam = (taxYear: string): string => taxYear.replace("/", "-");

/** The tax year in a `?year=2026-27` param, or null when it is missing or not a supported year. */
export const taxYearFromParam = (param: string | null | undefined): string | null => {
  if (!param || !/^\d{4}-\d{2}$/.test(param)) return null;
  const year = param.replace("-", "/");
  return isSupportedUkTaxYear(year) ? year : null;
};

/** The Self Assessment list page, on a tax year when one is given. */
export const selfAssessmentPath = (taxYear?: string): string =>
  taxYear ? `/app/self-assessment?year=${taxYearToParam(taxYear)}` : "/app/self-assessment";

/** One income source's page, on a tax year when one is given. */
export const sourcePagePath = (source: TaxSource, taxYear?: string): string =>
  `/app/self-assessment/${source}${taxYear ? `?year=${taxYearToParam(taxYear)}` : ""}`;
