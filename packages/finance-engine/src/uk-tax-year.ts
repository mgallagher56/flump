/**
 * Canonical UK tax-year API (E4 T2).
 *
 * One year-keyed rules object per supported tax year (2020/21 to 2026/27) and
 * pure calculators that take it. The raw tables stay in tax-rules.ts; this
 * module adds the per-year dividend and savings tables (moved out of
 * tax-calculator.ts) and the year resolver.
 *
 * Policy: figures are only the ones verified against GOV.UK pages. Anything
 * that could not be verified keeps the value the engine already used and is
 * listed in `UkTaxYearRules.unverified` as "UNVERIFIED: <reason>". Nothing
 * here is signed off until the owner signs off the test vectors.
 *
 * Money is pounds as floats. `roundPence` is applied at public result
 * boundaries only; there is no whole-pound rounding inside the calculators.
 *
 * Import note: tax-rules.ts imports the date helpers from this module and this
 * module imports the tables from tax-rules.ts. That cycle is safe because
 * neither module touches the other's exports while it is evaluating.
 */

import {
  UK_EMPLOYER_NI_RATES,
  UK_EWNI_INCOME_TAX,
  UK_NATIONAL_INSURANCE,
  UK_SCOTLAND_INCOME_TAX,
  UK_STUDENT_LOANS,
  type UKEmployerNIRate,
  type UKEWNIIncomeTaxYear,
  type UKNationalInsuranceYear,
  type UKScotlandIncomeTaxYear,
  type UKStudentLoanYear,
} from "./tax-rules.js";
import { SUPPORTED_UK_TAX_YEARS, type UkTaxRegion, type UkTaxYear } from "./types.js";
import {
  ruleSourceUrls,
  ruleUnverifiedNotes,
  UK_RULE_SOURCES,
  type UkRuleSources,
} from "./uk-rule-sources.js";

export { SUPPORTED_UK_TAX_YEARS };

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class UnsupportedUkTaxYearError extends Error {
  readonly year: string;
  /** Set when only one table is missing for an otherwise supported year. */
  readonly table?: string;

  constructor(year: string, table?: string) {
    super(
      table
        ? `No verified ${table} data for UK tax year "${year}".`
        : `Unsupported UK tax year "${year}". Supported years: ${SUPPORTED_UK_TAX_YEARS.join(", ")}.`,
    );
    this.name = "UnsupportedUkTaxYearError";
    this.year = year;
    this.table = table;
  }
}

// ---------------------------------------------------------------------------
// Money helpers (D5-a)
// ---------------------------------------------------------------------------

/** Rounds to the nearest penny. Apply only at public result boundaries. */
export function roundPence(x: number): number {
  return Math.round((x + Number.EPSILON) * 100) / 100;
}

/** Parses a money value once. null, undefined, blank and non-numeric input give 0. */
export function toMoney(value: number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const trimmed = value.trim();
  if (trimmed === "") return 0;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : 0;
}

// ---------------------------------------------------------------------------
// Year resolution (D8-a: year starts on 6 April, string based)
// ---------------------------------------------------------------------------

function yearLabel(startYear: number): string {
  return `${startYear}/${String((startYear + 1) % 100).padStart(2, "0")}`;
}

/**
 * Tax year containing an ISO date ("YYYY-MM-DD", optionally followed by a
 * time). Reads the date digits only: no Date parsing, no local time zone.
 * 5 April belongs to the year that ends that day; 6 April starts the next.
 * Returns the label even for years the engine does not support.
 */
export function getUkTaxYearForDate(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);
  if (!match) throw new RangeError(`Not an ISO date (YYYY-MM-DD): "${isoDate}"`);
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth) {
    throw new RangeError(`Not a valid calendar date: "${isoDate}"`);
  }
  const startsThisYear = month > 4 || (month === 4 && day >= 6);
  return yearLabel(startsThisYear ? year : year - 1);
}

const londonDate = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** The calendar date ("YYYY-MM-DD") in the UK at the given instant. */
export function getUkCalendarDate(now: Date): string {
  const parts = londonDate.formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function isSupportedUkTaxYear(year: string): year is UkTaxYear {
  return (SUPPORTED_UK_TAX_YEARS as readonly string[]).includes(year);
}

/** Current UK tax year (UK calendar date). Throws if the year is not supported. */
export function getCurrentUkTaxYear(now: Date = new Date()): UkTaxYear {
  const year = getUkTaxYearForDate(getUkCalendarDate(now));
  if (!isSupportedUkTaxYear(year)) throw new UnsupportedUkTaxYearError(year);
  return year;
}

/** Latest tax year the engine has rates for. */
export function getLatestSupportedUkTaxYear(): UkTaxYear {
  return SUPPORTED_UK_TAX_YEARS[SUPPORTED_UK_TAX_YEARS.length - 1] as UkTaxYear;
}

/** The tax year straight after the latest supported one (the first year the engine lacks). */
export function getFirstUnsupportedUkTaxYear(): string {
  const latest = getLatestSupportedUkTaxYear();
  return yearLabel(Number.parseInt(latest.slice(0, 4), 10) + 1);
}

/**
 * The ONE place that decides which rates "today" uses.
 *
 * `calendarYear` is the tax year the clock is in (may be unsupported). `ratesYear` is the
 * supported year whose rates are used. When the clock is past the latest supported year
 * `isFallback` is true and the UI must say so (TaxRatesStatusBanner). Before the earliest
 * supported year there is nothing sensible to fall back to, so it throws.
 */
export interface UkTaxYearContext {
  calendarYear: string;
  ratesYear: UkTaxYear;
  isFallback: boolean;
  reason?: "after-latest-supported";
}

export function getUkTaxYearContext(now: Date = new Date()): UkTaxYearContext {
  const calendarYear = getUkTaxYearForDate(getUkCalendarDate(now));
  if (isSupportedUkTaxYear(calendarYear)) {
    return { calendarYear, ratesYear: calendarYear, isFallback: false };
  }
  if (compareTaxYearLabels(calendarYear, getLatestSupportedUkTaxYear()) > 0) {
    return {
      calendarYear,
      ratesYear: getLatestSupportedUkTaxYear(),
      isFallback: true,
      reason: "after-latest-supported",
    };
  }
  throw new UnsupportedUkTaxYearError(calendarYear);
}

function compareTaxYearLabels(a: string, b: string): number {
  return Number.parseInt(a.slice(0, 4), 10) - Number.parseInt(b.slice(0, 4), 10);
}

export type UkTaxYearClassification =
  | { kind: "supported" }
  | { kind: "fallback"; ratesYear: UkTaxYear }
  | { kind: "unsupported"; reason: "before-earliest" | "too-far-ahead" | "malformed" };

/**
 * How an explicit year (a record, a selector, an MCP argument) will be treated.
 * Only the year straight after the latest supported one may use the latest rates (with a
 * visible banner); everything else unsupported must be rejected, never substituted.
 */
export function classifyUkTaxYear(year: string): UkTaxYearClassification {
  if (isSupportedUkTaxYear(year)) return { kind: "supported" };
  const m = /^(\d{4})\/(\d{2})$/.exec(year);
  if (!m || (Number(m[1]) + 1) % 100 !== Number(m[2])) {
    return { kind: "unsupported", reason: "malformed" };
  }
  if (year === getFirstUnsupportedUkTaxYear()) {
    return { kind: "fallback", ratesYear: getLatestSupportedUkTaxYear() };
  }
  return compareTaxYearLabels(year, getLatestSupportedUkTaxYear()) > 0
    ? { kind: "unsupported", reason: "too-far-ahead" }
    : { kind: "unsupported", reason: "before-earliest" };
}

/** Human label, e.g. "2026/27" -> "6 April 2026 to 5 April 2027". */
export function formatTaxYearLabel(year: string, long = false): string {
  if (!long) return year;
  const start = Number.parseInt(year.slice(0, 4), 10);
  return `6 April ${start} to 5 April ${start + 1}`;
}

/**
 * Strict resolver used by every calculator.
 * - undefined: the current year per getUkTaxYearContext (falls back to the latest supported
 *   year after it, never throws once past the last year).
 * - a supported year: itself.
 * - anything else: throws UnsupportedUkTaxYearError. No calculator substitutes a year on its own.
 */
export function resolveUkTaxYear(year?: string, now?: Date): UkTaxYear {
  if (year === undefined) return getUkTaxYearContext(now).ratesYear;
  if (!isSupportedUkTaxYear(year)) throw new UnsupportedUkTaxYearError(year);
  return year;
}

// ---------------------------------------------------------------------------
// Per-year tables added by this module
// ---------------------------------------------------------------------------

export interface UkSavingsRules {
  /** Personal savings allowance, basic-rate taxpayer. */
  psaBasic: number;
  psaHigher: number;
  psaAdditional: number;
}

export interface UkDividendRules {
  allowance: number;
  basicRate: number;
  higherRate: number;
  additionalRate: number;
}

// PSA 1,000 / 500 / 0: https://www.gov.uk/apply-tax-free-interest-on-savings/how-much-is-tax-free
// (current guidance, no tax year named, so only treated as verified for 2026/27).
// Carried over unchanged from tax-calculator.ts and uk-tax.ts for every year.
const SAVINGS: UkSavingsRules = { psaBasic: 1000, psaHigher: 500, psaAdditional: 0 };

// Dividends: https://www.gov.uk/tax-on-dividends and
// https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past
// 2023/24 to 2026/27 are verified. 2026/27 ordinary and upper rates rose to
// 10.75% and 35.75% from 6 April 2026 (additional stays 39.35%, allowance 500).
// 2020/21 to 2022/23 come from the point-in-time versions of ITA 2007 on
// legislation.gov.uk, read for this change: s.8 rates and s.13A allowance (2,000, all three years).
// 2020/21 and 2021/22 (s.8 at 06/04/2020 and 06/04/2021): 7.5% / 32.5% / 38.1%
//   https://www.legislation.gov.uk/ukpga/2007/3/section/8/2021-04-06
// 2022/23 (s.8 at 06/04/2022): 8.75% / 33.75% / 39.35%
//   https://www.legislation.gov.uk/ukpga/2007/3/section/8/2022-04-06
//   https://www.legislation.gov.uk/ukpga/2007/3/section/13A/2022-04-06
const DIVIDENDS_2020_TO_2022: UkDividendRules = {
  allowance: 2000,
  basicRate: 0.075,
  higherRate: 0.325,
  additionalRate: 0.381,
};
const DIVIDENDS_2022_23: UkDividendRules = {
  allowance: 2000,
  basicRate: 0.0875,
  higherRate: 0.3375,
  additionalRate: 0.3935,
};

const DIVIDENDS: Record<UkTaxYear, UkDividendRules> = {
  "2020/21": DIVIDENDS_2020_TO_2022,
  "2021/22": DIVIDENDS_2020_TO_2022,
  "2022/23": DIVIDENDS_2022_23,
  "2023/24": { allowance: 1000, basicRate: 0.0875, higherRate: 0.3375, additionalRate: 0.3935 },
  "2024/25": { allowance: 500, basicRate: 0.0875, higherRate: 0.3375, additionalRate: 0.3935 },
  "2025/26": { allowance: 500, basicRate: 0.0875, higherRate: 0.3375, additionalRate: 0.3935 },
  "2026/27": { allowance: 500, basicRate: 0.1075, higherRate: 0.3575, additionalRate: 0.3935 },
};

// Pension annual allowance (E25-T1). Verified for every supported year against HMRC's per-year
// table (https://www.gov.uk/government/publications/rates-and-allowances-pension-schemes/pension-schemes-rates):
// 40,000 for 2020/21 to 2022/23, 60,000 from 2023/24.
const PENSION_ANNUAL_ALLOWANCE: Record<UkTaxYear, number> = {
  "2020/21": 40000,
  "2021/22": 40000,
  "2022/23": 40000,
  "2023/24": 60000,
  "2024/25": 60000,
  "2025/26": 60000,
  "2026/27": 60000,
};

// ISA allowance 20,000: https://www.gov.uk/individual-savings-accounts ("In the 2026 to 2027 tax
// year, the maximum you can save in ISAs is 20,000"). Other years UNVERIFIED in the registry.
const ISA_ALLOWANCE = 20000;

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

export interface UkTaxYearRules {
  year: UkTaxYear;
  ewni: UKEWNIIncomeTaxYear;
  scotland: UKScotlandIncomeTaxYear;
  ni: UKNationalInsuranceYear;
  employerNi: UKEmployerNIRate;
  studentLoans: UKStudentLoanYear;
  savings: UkSavingsRules;
  dividends: UkDividendRules;
  giftAidGrossUp: 1.25;
  /** Unique source URLs, derived from `ruleSources`. */
  sources: string[];
  /** Per-figure-group source URL and verification status (E25-T1). */
  ruleSources: UkRuleSources;
  /** Annual allowance for pensions (gross contributions, before tapering). */
  pensionAnnualAllowance: number;
  /** ISA subscription allowance across all ISAs. */
  isaAllowance: number;
  /**
   * Adjusted net income at which the personal allowance is fully lost:
   * taper start + 2 x personal allowance (GBP1 lost per GBP2).
   */
  taperEnd: number;
  /** True only when `unverified` is empty. */
  verified: boolean;
  /** One "UNVERIFIED: <reason>" line per figure not confirmed on GOV.UK. */
  unverified: string[];
}

export function getUkTaxYearRules(year: UkTaxYear): UkTaxYearRules {
  if (!isSupportedUkTaxYear(year)) throw new UnsupportedUkTaxYearError(String(year));
  const ewni = UK_EWNI_INCOME_TAX[year];
  const scotland = UK_SCOTLAND_INCOME_TAX[year];
  const ni = UK_NATIONAL_INSURANCE[year];
  const employerNi = UK_EMPLOYER_NI_RATES[year];
  const studentLoans = UK_STUDENT_LOANS[year];
  if (!ewni)
    throw new UnsupportedUkTaxYearError(year, "England, Wales and Northern Ireland income tax");
  if (!scotland) throw new UnsupportedUkTaxYearError(year, "Scottish income tax");
  if (!ni) throw new UnsupportedUkTaxYearError(year, "National Insurance");
  if (!employerNi) throw new UnsupportedUkTaxYearError(year, "employer National Insurance");
  if (!studentLoans) throw new UnsupportedUkTaxYearError(year, "student loan");
  const unverified = ruleUnverifiedNotes(year);
  return {
    year,
    ewni,
    scotland,
    ni,
    employerNi,
    studentLoans,
    savings: SAVINGS,
    dividends: DIVIDENDS[year],
    giftAidGrossUp: 1.25,
    sources: ruleSourceUrls(year),
    ruleSources: UK_RULE_SOURCES[year],
    pensionAnnualAllowance: PENSION_ANNUAL_ALLOWANCE[year],
    isaAllowance: ISA_ALLOWANCE,
    taperEnd: ewni.personalAllowanceTaperStart + 2 * ewni.personalAllowance,
    verified: unverified.length === 0,
    unverified,
  };
}

// ---------------------------------------------------------------------------
// Calculators (pure; each takes the year's rules)
// ---------------------------------------------------------------------------

/**
 * Personal allowance after the taper: GBP1 lost per GBP2 of adjusted net
 * income above the taper start, taper floored to whole pounds, never below 0.
 */
export function calculatePersonalAllowanceForYear(
  adjustedNetIncome: number,
  rules: UkTaxYearRules,
): number {
  const { personalAllowance, personalAllowanceTaperStart } = rules.ewni;
  if (adjustedNetIncome <= personalAllowanceTaperStart) return personalAllowance;
  const taper = Math.floor((adjustedNetIncome - personalAllowanceTaperStart) / 2);
  return Math.max(0, personalAllowance - taper);
}

export interface IncomeTaxBandResult {
  name: string;
  rate: number;
  /** Taxable income falling in this band. */
  taxable: number;
  tax: number;
}

export interface IncomeTaxResult {
  total: number;
  bands: IncomeTaxBandResult[];
}

/**
 * Income tax on taxable income (income after the personal allowance).
 *
 * EWNI: basic rate up to basicRateBandWidth + ext, higher rate up to
 * additionalRateThreshold + ext (a taxable-income figure: 125,140 from 2023/24,
 * 150,000 before), additional rate above.
 * Scotland: walks rules.scotland.bands. `bandExtension` (grossed-up Gift Aid,
 * ITA 2007 s.414(2)(b)) raises "the upper limit for the Scottish basic rate and
 * the limits for any Scottish rates above the Scottish basic rate": the upper
 * limit of the 20% (basic rate) band and every limit (lower and upper) of the bands
 * after it. Bands before Basic (Starter) are unchanged.
 */
export function calculateIncomeTaxOnTaxable(
  taxable: number,
  rules: UkTaxYearRules,
  region: UkTaxRegion,
  opts: { bandExtension?: number } = {},
): IncomeTaxResult {
  const income = Math.max(0, taxable);
  const raw: { name: string; rate: number; taxable: number; tax: number }[] = [];

  if (region === "SCOTLAND") {
    const ext = Math.max(0, opts.bandExtension ?? 0);
    const bands = rules.scotland.bands;
    // The basic band is identified by its 20% rate, not its display name: the statute does
    // not define Scottish band names, and a rename must not silently disable the extension.
    const basicIdx = bands.findIndex((b) => b.rate === 0.2);
    if (basicIdx < 0) {
      throw new Error("Scottish income tax bands have no 20% (basic rate) band");
    }
    for (const [i, band] of bands.entries()) {
      const aboveBasic = basicIdx >= 0 && i > basicIdx;
      const atOrAboveBasic = basicIdx >= 0 && i >= basicIdx;
      const lower = band.from + (aboveBasic ? ext : 0);
      const upper =
        band.to === null ? Number.POSITIVE_INFINITY : band.to + (atOrAboveBasic ? ext : 0);
      const inBand = Math.max(0, Math.min(income, upper) - lower);
      raw.push({ name: band.name, rate: band.rate, taxable: inBand, tax: inBand * band.rate });
    }
  } else {
    const ext = Math.max(0, opts.bandExtension ?? 0);
    const e = rules.ewni;
    const basicTop = e.basicRateBandWidth + ext;
    const higherTop = e.additionalRateThreshold + ext;
    const basic = Math.min(income, basicTop);
    const higher = Math.max(0, Math.min(income, higherTop) - basicTop);
    const additional = Math.max(0, income - higherTop);
    raw.push(
      { name: "Basic", rate: e.basicRate, taxable: basic, tax: basic * e.basicRate },
      { name: "Higher", rate: e.higherRate, taxable: higher, tax: higher * e.higherRate },
      {
        name: "Additional",
        rate: e.additionalRate,
        taxable: additional,
        tax: additional * e.additionalRate,
      },
    );
  }

  return {
    total: roundPence(raw.reduce((sum, b) => sum + b.tax, 0)),
    bands: raw.map((b) => ({ ...b, taxable: roundPence(b.taxable), tax: roundPence(b.tax) })),
  };
}

/** Class 1 employee NI on annual pay (annual method, category A). */
export function calculateEmployeeNi(pay: number, rules: UkTaxYearRules): number {
  const { primaryThreshold, upperEarningsLimit, mainRate, upperRate } = rules.ni.class1;
  if (pay <= primaryThreshold) return 0;
  const main = Math.min(pay, upperEarningsLimit) - primaryThreshold;
  const upper = Math.max(0, pay - upperEarningsLimit);
  return roundPence(main * mainRate + upper * upperRate);
}

/** Class 4 NI on annual self-employed profits. */
export function calculateClass4Ni(profit: number, rules: UkTaxYearRules): number {
  const { lowerProfitsLimit, upperProfitsLimit, mainRate, upperRate } = rules.ni.class4;
  if (profit <= lowerProfitsLimit) return 0;
  const main = Math.min(profit, upperProfitsLimit) - lowerProfitsLimit;
  const upper = Math.max(0, profit - upperProfitsLimit);
  return roundPence(main * mainRate + upper * upperRate);
}

/**
 * Employer NI saved by salary sacrifice: the sacrificed amount that would have
 * been above the secondary threshold, times the secondary rate.
 */
export function calculateEmployerNiSaving(
  gross: number,
  sacrifice: number,
  rules: UkTaxYearRules,
): number {
  if (gross <= 0 || sacrifice <= 0) return 0;
  const { secondaryThreshold, rate } = rules.employerNi;
  const eligible = Math.min(sacrifice, Math.max(0, gross - secondaryThreshold));
  return roundPence(eligible * rate);
}

export type UkStudentLoanPlanKey = keyof UKStudentLoanYear["plans"];

/** Annual student loan repayment: plan rate on pay above the plan threshold. */
export function calculateStudentLoanRepayment(
  pay: number,
  plan: UkStudentLoanPlanKey,
  rules: UkTaxYearRules,
): number {
  const entry = rules.studentLoans.plans[plan];
  if (!entry) throw new UnsupportedUkTaxYearError(rules.year, `student loan ${plan}`);
  if (pay <= entry.threshold) return 0;
  return roundPence((pay - entry.threshold) * entry.rate);
}
