import { resolveAccountSharePercent } from "./joint-share.js";
import {
  calculatePropertyProfit,
  calculateSelfAssessmentPayments,
  calculateTradingProfit,
  type SelfAssessmentPayments,
} from "./uk-self-assessment.js";
import {
  calculateClass4Ni,
  calculateIncomeTaxOnTaxable,
  calculatePersonalAllowanceForYear,
  getUkTaxYearForDate,
  getUkTaxYearRules,
  resolveUkTaxYear,
  type UkTaxYearRules,
} from "./uk-tax-year.js";

export type TaxSource = "paye" | "self-employed" | "rental" | "savings";

export interface TaxRecord {
  id: string;
  userId: string;
  type: "income" | "expense";
  source: TaxSource;
  category: string;
  name: string;
  amount: number | string; // TypeORM decimal fields are often returned as strings in JSON
  frequency: "one-off" | "monthly" | "annual";
  date: string; // YYYY-MM-DD
  endDate: string | null; // YYYY-MM-DD
  notes: string | null;
  /**
   * The account the record describes (slice 7): a rental Property or its mortgage for rental
   * records, a savings account for savings records. null or missing when not linked.
   */
  accountId?: string | null;
  receiptFilename: string | null;
  receiptMimeType: string | null;
  /** Never returned by the API (E20-N15): receipts are fetched from the receipt route. */
  receiptData?: string | null;
  hasReceipt?: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * The fields the tax maths reads. Callers that never hold receipts or row metadata (the MCP
 * context pack, E20-N15) pass this rather than inventing values for the rest of `TaxRecord`.
 */
export type TaxRecordFields = Omit<
  TaxRecord,
  | "userId"
  | "receiptFilename"
  | "receiptMimeType"
  | "receiptData"
  | "hasReceipt"
  | "createdAt"
  | "updatedAt"
>;

export interface UserProfile {
  id: string;
  userId: string;
  displayName: string | null;
  currency: string;
  country?: string;
  employmentType: "employed" | "self-employed" | "other" | null;
  annualSalary: number | string | null;
  monthlyTakeHome: number | string | null;
  hasSecondIncome: boolean;
  secondIncomeMonthly: number | string | null;
  hasRentalIncome: boolean;
  rentalIncomeMonthly: number | string | null;
  hasMortgage: boolean;
  propertyOwnershipShare: number | string;
  setupChecklistCompletedSteps: string[];
}

/**
 * Residential finance costs not relieved in earlier years, entered once in the year they are used
 * (ITTOIA 2005 s.274AA(4)). The person's own figure, so the ownership share is not applied.
 */
export const FINANCE_COSTS_BROUGHT_FORWARD_CATEGORY = "finance_costs_brought_forward";

/** A record of finance costs brought forward: never a property cost or income of the year. */
export const isFinanceCostsBroughtForwardRecord = (record: {
  source: string;
  category: string;
}): boolean =>
  record.source === "rental" && record.category === FINANCE_COSTS_BROUGHT_FORWARD_CATEGORY;

export const RENTAL_CATEGORIES = [
  { id: "rental_income", name: "Rental income", type: "income" as const },
  {
    id: "rent_rates_insurance",
    name: "Rent, rates, insurance, ground rents",
    type: "expense" as const,
  },
  {
    id: "legal_management_fees",
    name: "Legal, management and other professional fees",
    type: "expense" as const,
  },
  { id: "repairs_maintenance", name: "Property repairs and maintenance", type: "expense" as const },
  { id: "replace_domestic_items", name: "Replace domestic items", type: "expense" as const },
  { id: "services_costs", name: "Costs of services provided", type: "expense" as const },
  {
    id: "mortgage_interest",
    name: "Mortgage interest and other residential finance costs",
    type: "expense" as const,
  },
  {
    id: FINANCE_COSTS_BROUGHT_FORWARD_CATEGORY,
    name: "Finance costs brought forward from earlier years",
    type: "expense" as const,
  },
];

export const SELF_EMPLOYED_CATEGORIES = [
  { id: "self_employed_income", name: "Self-employed turnover or income", type: "income" as const },
  {
    id: "office_costs",
    name: "Office, stationery, phone, internet, postage",
    type: "expense" as const,
  },
  {
    id: "travel_costs",
    name: "Car, van, travel expenses, fuel, parking",
    type: "expense" as const,
  },
  { id: "clothing_costs", name: "Uniforms, protective clothing", type: "expense" as const },
  { id: "staff_costs", name: "Employee salaries, subcontractor costs", type: "expense" as const },
  { id: "premises_costs", name: "Rent, rates, power, insurance", type: "expense" as const },
  {
    id: "legal_finance_fees",
    name: "Accountant, solicitor, bank charges, business insurance",
    type: "expense" as const,
  },
  { id: "advertising_marketing", name: "Website, ads, marketing", type: "expense" as const },
  {
    id: "stock_raw_materials",
    name: "Cost of goods sold, stock, raw materials",
    type: "expense" as const,
  },
  { id: "other_expenses", name: "Other business expenses", type: "expense" as const },
];

export const PAYE_CATEGORIES = [
  { id: "paye_salary", name: "Base PAYE salary", type: "income" as const },
  { id: "paye_bonus", name: "Bonus, commission and overtime", type: "income" as const },
  { id: "paye_benefit", name: "Taxable benefits in kind (P11D)", type: "income" as const },
  { id: "paye_pension", name: "Employee pension contributions", type: "expense" as const },
];

export const SAVINGS_CATEGORIES = [
  { id: "savings_interest", name: "Taxable bank and savings interest", type: "income" as const },
  { id: "dividend_income", name: "Dividends from shares", type: "income" as const },
  { id: "isa_interest", name: "ISA interest and returns (tax-free)", type: "income" as const },
  {
    id: "investment_fees",
    name: "Investment management fees (not taken off for tax)",
    type: "expense" as const,
  },
];

export const ALL_TAX_CATEGORIES = [
  ...PAYE_CATEGORIES.map((c) => ({ ...c, source: "paye" as const })),
  ...SELF_EMPLOYED_CATEGORIES.map((c) => ({ ...c, source: "self-employed" as const })),
  ...RENTAL_CATEGORIES.map((c) => ({ ...c, source: "rental" as const })),
  ...SAVINGS_CATEGORIES.map((c) => ({ ...c, source: "savings" as const })),
];

export function getCategoriesForSource(source: TaxSource, type?: "income" | "expense") {
  let list: { id: string; name: string; type: "income" | "expense" }[] = [];
  if (source === "rental") list = RENTAL_CATEGORIES;
  else if (source === "self-employed") list = SELF_EMPLOYED_CATEGORIES;
  else if (source === "paye") list = PAYE_CATEGORIES;
  else if (source === "savings") list = SAVINGS_CATEGORIES;

  if (type) return list.filter((c) => c.type === type);
  return list;
}

/**
 * Tax year ("YYYY/YY") containing a date. Delegates to getUkTaxYearForDate
 * (6 April boundary, no local time). Non-ISO strings fall back to Date parsing
 * so existing callers that pass full timestamps keep working.
 */
export function getTaxYearForDate(dateStr: string): string {
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return getUkTaxYearForDate(dateStr);
  const date = new Date(dateStr);
  const pad = (n: number) => String(n).padStart(2, "0");
  return getUkTaxYearForDate(
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
  );
}

/**
 * Tax year ("YYYY/YY") a RECORD filed on `dateStr` belongs to, for listing and copying.
 * Same 6 April boundary as getTaxYearForDate (built on getUkTaxYearForDate): a record dated
 * 1-5 April belongs to the year that ends on 5 April (BE-08 M1). getRecordValueForMonth
 * buckets such a record into March so listing, copying and totals agree.
 */
export function getTaxYearForRecordDate(dateStr: string): string {
  return getTaxYearForDate(dateStr);
}

/**
 * Calendar month bucket ("YYYY-MM") for a record date. Records are bucketed by calendar month
 * (getMonthsForTaxYear), except 1-5 April, which belongs to the tax year ending on 5 April and
 * so is bucketed into that year's last month, March.
 */
export function getRecordBucketMonth(dateStr: string): string {
  const month = dateStr.substring(0, 7);
  const match = /^(\d{4})-04-0([1-5])/.exec(dateStr);
  return match ? `${match[1]}-03` : month;
}

/**
 * End date (YYYY-MM-DD) stored for an annual record: 5 April closing the tax year that
 * getTaxYearForRecordDate files `dateStr` under. The tax year starts on 6 April, so 6 April or
 * later ends 5 April of the following year, and 1 January to 5 April ends 5 April of the same
 * year (2024-04-01 ends 2024-04-05). The backend sets this on create and the BackfillAnnualTaxRecordEndDate migration mirrors it in SQL.
 */
export function getAnnualRecordEndDate(dateStr: string): string {
  const startYear = Number.parseInt(getTaxYearForRecordDate(dateStr).split("/")[0] || "0", 10);
  return `${startYear + 1}-04-05`;
}

export function getPreviousTaxYear(taxYear: string): string {
  const parts = taxYear.split("/");
  const startYear = Number.parseInt(parts[0] || "0", 10);
  if (Number.isNaN(startYear)) return taxYear;
  const prevStart = startYear - 1;
  return `${prevStart}/${startYear.toString().slice(-2)}`;
}

export function getNextTaxYear(taxYear: string): string {
  const parts = taxYear.split("/");
  const startYear = Number.parseInt(parts[0] || "0", 10);
  if (Number.isNaN(startYear)) return taxYear;
  const nextStart = startYear + 1;
  return `${nextStart}/${(nextStart + 1).toString().slice(-2)}`;
}

// Generate the 12 calendar months YYYY-MM for a tax year YYYY/YY. Record values are bucketed
// by calendar month; a record dated 1-5 April is bucketed into March (getRecordBucketMonth),
// so it counts in the year getTaxYearForRecordDate files it under.
export function getMonthsForTaxYear(taxYear: string): string[] {
  const parts = taxYear.split("/");
  const startYear = Number.parseInt(parts[0] || "0", 10);
  const months: string[] = [];
  // April to December of startYear
  for (let m = 4; m <= 12; m++) {
    months.push(`${startYear}-${m.toString().padStart(2, "0")}`);
  }
  // January to March of startYear + 1
  const endYear = startYear + 1;
  for (let m = 1; m <= 3; m++) {
    months.push(`${endYear}-${m.toString().padStart(2, "0")}`);
  }
  return months;
}

// Calculate the value of a record in a specific month YYYY-MM
export function getRecordValueForMonth(record: TaxRecordFields, monthYYYYMM: string): number {
  const amount =
    typeof record.amount === "string" ? Number.parseFloat(record.amount) : record.amount;
  if (!amount || Number.isNaN(amount)) return 0;
  const recordMonth = getRecordBucketMonth(record.date);

  if (record.frequency === "one-off") {
    return recordMonth === monthYYYYMM ? amount : 0;
  }

  if (record.frequency === "monthly") {
    if (recordMonth <= monthYYYYMM) {
      if (!record.endDate || getRecordBucketMonth(record.endDate) >= monthYYYYMM) {
        return amount;
      }
    }
    return 0;
  }

  if (record.frequency === "annual") {
    // E23 D16 / D-7-A: an annual record is a once-a-year figure filed under the tax year that
    // contains its `date` (record rule, getTaxYearForRecordDate). It contributes exactly once,
    // in the month of its date, and never repeats on later anniversaries, whatever `endDate`
    // says (a later endDate does not make it recur). Distinct years need distinct records.
    return recordMonth === monthYYYYMM ? amount : 0;
  }

  return 0;
}

export function getRecordAnnualTotalForTaxYear(record: TaxRecordFields, taxYear: string): number {
  const months = getMonthsForTaxYear(taxYear);
  let total = 0;
  for (const month of months) {
    total += getRecordValueForMonth(record, month);
  }
  return total;
}

export function isRecordActiveInTaxYear(record: TaxRecordFields, taxYear: string): boolean {
  return getRecordAnnualTotalForTaxYear(record, taxYear) > 0;
}

/**
 * Income and costs recorded for one tax year, as entered, before any allowance. Finance costs
 * brought forward are left out: they are not a cost of the year. Optionally for one source.
 */
export function recordedTotalsForTaxYear(
  records: readonly TaxRecordFields[],
  taxYear: string,
  source?: TaxSource,
): { income: number; expenses: number } {
  let income = 0;
  let expenses = 0;
  for (const r of records) {
    if (source !== undefined && r.source !== source) continue;
    if (isFinanceCostsBroughtForwardRecord(r)) continue;
    const yearly = getRecordAnnualTotalForTaxYear(r, taxYear);
    if (r.type === "income") income += yearly;
    else expenses += yearly;
  }
  return { income, expenses };
}

export function buildCopiedRecordForTaxYear(
  record: TaxRecord,
  targetTaxYear: string,
  amountOverride?: number,
): Omit<TaxRecord, "id" | "userId" | "createdAt" | "updatedAt"> {
  const sourceTaxYear = getTaxYearForRecordDate(record.date);
  const sourceStartYear = Number.parseInt(sourceTaxYear.split("/")[0] || "0", 10);
  const targetStartYear = Number.parseInt(targetTaxYear.split("/")[0] || "0", 10);
  const yearDiff =
    Number.isNaN(sourceStartYear) || Number.isNaN(targetStartYear)
      ? 1
      : targetStartYear - sourceStartYear;

  const shiftDateString = (dStr: string | null) => {
    if (!dStr) return null;
    const parts = dStr.split("-");
    if (parts.length !== 3) return dStr;
    const y = Number.parseInt(parts[0] || "0", 10) + yearDiff;
    // 29 Feb has no equivalent in a non-leap year: use 28 Feb rather than an invalid date.
    const isLeapYear = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
    const day = parts[1] === "02" && parts[2] === "29" && !isLeapYear ? "28" : parts[2];
    return `${y}-${parts[1]}-${day}`;
  };

  const newDate = shiftDateString(record.date) || record.date;
  const newEndDate = shiftDateString(record.endDate);

  // Shift name year references if present e.g. (2024/25) -> (2025/26), 24/25 -> 25/26
  let newName = record.name;
  if (sourceTaxYear && targetTaxYear) {
    const shortSourceYear = `${sourceTaxYear.slice(2, 4)}/${sourceTaxYear.slice(5, 7)}`;
    const shortTargetYear = `${targetTaxYear.slice(2, 4)}/${targetTaxYear.slice(5, 7)}`;
    newName = newName.replace(sourceTaxYear, targetTaxYear);
    newName = newName.replace(shortSourceYear, shortTargetYear);
  }

  const finalAmount =
    amountOverride !== undefined
      ? amountOverride
      : typeof record.amount === "string"
        ? Number.parseFloat(record.amount)
        : record.amount;

  return {
    name: newName,
    source: record.source,
    type: record.type,
    category: record.category,
    amount: finalAmount,
    frequency: record.frequency,
    date: newDate,
    endDate: newEndDate,
    notes: record.notes
      ? `Copied from ${sourceTaxYear}: ${record.notes}`
      : `Copied from ${sourceTaxYear}`,
    receiptFilename: null,
    receiptMimeType: null,
    receiptData: null,
  };
}

/**
 * Where a person's share of a rental record comes from (owner decision 6, slice 7): the account
 * the record is linked to, else one share for unlinked records with a basis saying why.
 */
export interface RentalShares {
  /** Share (0 to 100) of each rental Property and buy-to-let mortgage account, by account id. */
  byAccountId: Readonly<Record<string, number>>;
  unlinked: {
    share: number;
    /**
     * `only-rental`: the one rental property's share, or the share all of them have in common;
     * `shares-differ`: rental properties with different shares, so an unlinked record is counted
     * in full until it is linked; `no-rental-property`: no rental property account, so in full.
     */
    basis: "only-rental" | "shares-differ" | "no-rental-property";
  };
}

/** The account fields `rentalSharesFromAccounts` reads. */
export interface RentalShareAccount {
  /** Accounts without an id are skipped: no record can point at them. */
  id?: string | null;
  type?: string | null;
  accountSubtype?: string | null;
  ownership?: string | null;
  sharePercent?: number | string | null;
  linkedAccountId?: string | null;
}

const isRentalProperty = (a: RentalShareAccount) =>
  a.type === "Property" && a.accountSubtype === "rental";

/**
 * The share of each rental property and of each mortgage, from the accounts (owner decision 6). A
 * rental record can be linked to any mortgage (the loan whose interest is the finance cost), so a
 * record linked to one takes that loan's share; a property and its mortgage can have different
 * shares (decision 14). The unlinked share is worked out from the rental properties only.
 */
export function rentalSharesFromAccounts(accounts: readonly RentalShareAccount[]): RentalShares {
  const byAccountId: Record<string, number> = {};
  const withIds = accounts.filter(
    (a): a is RentalShareAccount & { id: string } => typeof a.id === "string",
  );
  const rentalIds = new Set(withIds.filter(isRentalProperty).map((a) => a.id));
  for (const a of withIds) {
    if (isRentalProperty(a) || a.type === "Mortgage") {
      byAccountId[a.id] = resolveAccountSharePercent(a);
    }
  }
  const propertyShares = [...new Set([...rentalIds].map((id) => byAccountId[id] as number))];
  const unlinked: RentalShares["unlinked"] =
    propertyShares.length === 0
      ? { share: 100, basis: "no-rental-property" }
      : propertyShares.length === 1
        ? { share: propertyShares[0] as number, basis: "only-rental" }
        : { share: 100, basis: "shares-differ" };
  return { byAccountId, unlinked };
}

export interface UkTaxCalculationOptions {
  /** Residential finance costs not relieved in earlier years (ITTOIA 2005 s.274AA(4)). */
  financeCostsBroughtForward?: number;
  /**
   * Where the person pays Income Tax. Scottish rates apply to non-savings income only (ITA 2007
   * s.11A); savings and dividends stay on UK rates and bands. Default England, Wales and NI.
   */
  region?: "SCOTLAND" | "ENGLAND_NI_WALES";
  /**
   * The share of each rental record, by the account it is linked to (slice 7). When left out,
   * `propertyOwnershipShare` applies to every rental record, as before.
   */
  rentalShares?: RentalShares;
}

export interface TaxCalculationResult {
  taxYear: string;
  payeSalary: number;
  propertyOwnershipShare: number;

  // PAYE
  payeIncomeGross: number;
  payeExpenses: number;
  effectivePayeSalary: number;

  // Rental totals (100% and owned share)
  rentalIncomeGross: number;
  rentalExpensesExclInterest: number;
  rentalMortgageInterest: number;
  rentalProfitBeforeInterest: number;
  rentalProfitPostInterest: number; // For normal P&L reporting

  rentalIncomeGrossShare: number;
  rentalExpensesExclInterestShare: number;
  rentalMortgageInterestShare: number;
  rentalProfitBeforeInterestShare: number; // Used for UK taxable income
  rentalProfitPostInterestShare: number; // Used for owned profit share

  // Self Employed totals
  seIncomeGross: number;
  seExpenses: number;
  /** Taxable profit: income less the recorded costs, or less the trading allowance if larger. */
  seProfit: number;
  /** Trading allowance deducted in place of the recorded costs (0 when the costs were used). */
  tradingAllowanceUsed: number;
  /** Property allowance deducted in place of the recorded costs and finance cost relief. */
  propertyAllowanceUsed: number;
  /**
   * True when the recorded costs and the property allowance give the same total tax, including
   * when there is no rent for the allowance to cover. On a tie the estimate keeps the recorded
   * costs, so `propertyAllowanceUsed` is 0.
   */
  propertyRoutesTie: boolean;

  // Savings & Dividends totals
  savingsInterestGross: number;
  isaInterestGross: number;
  dividendIncomeGross: number;
  /** Investment fees recorded. Reported only: they do not reduce the tax (ITTOIA 2005 s.370, s.384). */
  savingsExpenses: number;
  personalSavingsAllowance: number;
  dividendAllowance: number;
  taxableSavingsInterest: number;
  taxableDividends: number;
  /**
   * Tax on savings interest as it would be without the rent. Extra savings tax the rent causes
   * (a higher band, a smaller allowance) is in `rentalPropertyTaxDueBeforeCredit`.
   */
  savingsTaxDue: number;
  /** Tax on dividends as it would be without the rent, on the same rule as `savingsTaxDue`. */
  dividendTaxDue: number;

  // Combined taxable income
  totalGrossIncome: number; // PAYE + SE Profit + Rental Profit Before Interest Share + Savings + Dividends
  personalAllowance: number;
  totalTaxableIncome: number;

  // Tax breakdowns
  payeTaxDue: number; // Base tax on PAYE salary alone
  /**
   * Tax on the salary and the self-employed profit together, with the allowance tapered by those two
   * only, minus the PAYE tax. The profit is non-savings income, so it comes before savings and
   * dividends (ITA 2007 s.16): the allowance savings and dividends take away is not counted here.
   */
  seTaxDue: number;
  /**
   * Income Tax on the salary from the Personal Allowance that savings interest and dividends take
   * away above £100,000 (ITA 2007 s.35). Part of the bill still to pay: PAYE sees only the salary.
   */
  allowanceTaperTaxDue: number;
  seClass4NIDue: number;
  rentalPropertyTaxDueBeforeCredit: number;
  rentalPropertyTaxCredit: number; // Section 24 credit
  rentalPropertyTaxDueAfterCredit: number;
  /** Finance costs not relieved in earlier years, brought into this year. */
  financeCostsBroughtForward: number;
  /**
   * Finance costs not relieved this year, which carry forward to the next (ITTOIA 2005
   * s.274AA(4)): the finance costs and the amount brought forward, less the amount used.
   */
  financeCostsCarriedForward: number;

  totalIncomeTaxDue: number;
  totalNIDue: number;
  totalTaxDue: number; // Total combined tax due (Income Tax + NI)
  netAdditionalTaxToPay: number; // totalTaxDue - PAYE tax already paid
  /**
   * PAYE tax beyond the year's whole bill, which would be repaid: totalTaxDue below the PAYE tax.
   * It happens when the finance cost credit is more than the tax on the rent and there is too
   * little other tax for it to come off (the Scottish 19% starter rate). 0 otherwise.
   */
  estimatedRepayment: number;
  /**
   * When `netAdditionalTaxToPay` is due: the bill on 31 January after the year, plus payments on
   * account towards the next year when they apply. PAYE tax counts as taken at source.
   */
  payments: SelfAssessmentPayments;
}

export function calculateUKTax(
  taxYear: string,
  records: TaxRecordFields[],
  payeSalary: number,
  propertyOwnershipShare: number,
  options: UkTaxCalculationOptions = {},
): TaxCalculationResult {
  // Strict (E22): an unsupported year throws UnsupportedUkTaxYearError instead of
  // silently using 2024/25. Callers should check classifyUkTaxYear() first.
  // Every rate, threshold and band comes from the year's rules (uk-tax-year.ts): this ledger adds
  // up the records and stacks the income types, and holds no rate table of its own.
  const yearRules = getUkTaxYearRules(resolveUkTaxYear(taxYear));
  const ewni = yearRules.ewni;
  const months = getMonthsForTaxYear(taxYear);

  // 1. Calculate Gross Totals for all 4 sources
  let rentalIncomeGross = 0;
  let rentalExpensesExclInterest = 0;
  let rentalMortgageInterest = 0;

  let seIncomeGross = 0;
  let seExpenses = 0;

  let payeIncomeGross = 0;
  let payeExpenses = 0;

  let savingsInterestGross = 0;
  let isaInterestGross = 0;
  let dividendIncomeGross = 0;
  let savingsExpenses = 0;

  const rentalRecordValues: Record<string, number[]> = {};
  const seRecordValues: Record<string, number[]> = {};
  const payeRecordValues: Record<string, number[]> = {};
  const savingsRecordValues: Record<string, number[]> = {};

  // Setup containers
  for (const cat of RENTAL_CATEGORIES) rentalRecordValues[cat.id] = months.map(() => 0);
  for (const cat of SELF_EMPLOYED_CATEGORIES) seRecordValues[cat.id] = months.map(() => 0);
  for (const cat of PAYE_CATEGORIES) payeRecordValues[cat.id] = months.map(() => 0);
  for (const cat of SAVINGS_CATEGORIES) savingsRecordValues[cat.id] = months.map(() => 0);

  for (const record of records) {
    // Counted once, below, not month by month.
    if (isFinanceCostsBroughtForwardRecord(record)) continue;
    for (let i = 0; i < months.length; i++) {
      const month = months[i]!;
      const val = getRecordValueForMonth(record, month);
      if (val > 0) {
        if (record.source === "rental") {
          const arr = rentalRecordValues[record.category];
          if (arr && arr[i] !== undefined) arr[i] = (arr[i] ?? 0) + val;
        } else if (record.source === "self-employed") {
          const arr = seRecordValues[record.category];
          if (arr && arr[i] !== undefined) arr[i] = (arr[i] ?? 0) + val;
        } else if (record.source === "paye") {
          const arr = payeRecordValues[record.category];
          if (arr && arr[i] !== undefined) arr[i] = (arr[i] ?? 0) + val;
        } else if (record.source === "savings") {
          const arr = savingsRecordValues[record.category];
          if (arr && arr[i] !== undefined) arr[i] = (arr[i] ?? 0) + val;
        }
      }
    }
  }

  // Sum Rental
  // Finance costs brought forward: one figure for one year, counted once in the tax year of its
  // date whatever its frequency, and only as a rental expense. Not a cost of this year: it joins
  // the finance costs below (ITTOIA 2005 s.274A(3)(c)).
  let financeCostsBroughtForwardRecords = 0;
  for (const record of records) {
    if (!isFinanceCostsBroughtForwardRecord(record) || record.type !== "expense") continue;
    if (getTaxYearForRecordDate(record.date) !== taxYear) continue;
    const amount =
      typeof record.amount === "string" ? Number.parseFloat(record.amount) : record.amount;
    if (amount > 0) financeCostsBroughtForwardRecords += amount;
  }
  for (const catId in rentalRecordValues) {
    const arr = rentalRecordValues[catId];
    const sum = arr ? arr.reduce((a, b) => a + b, 0) : 0;
    if (catId === "rental_income") {
      rentalIncomeGross += sum;
    } else if (catId === "mortgage_interest") {
      rentalMortgageInterest += sum;
    } else {
      rentalExpensesExclInterest += sum;
    }
  }

  // Sum Self Employed
  for (const catId in seRecordValues) {
    const arr = seRecordValues[catId];
    const sum = arr ? arr.reduce((a, b) => a + b, 0) : 0;
    if (catId === "self_employed_income") {
      seIncomeGross += sum;
    } else {
      seExpenses += sum;
    }
  }

  // Sum PAYE. Salary records are kept apart from bonus, commission, overtime and benefits so
  // the extras add to the salary instead of replacing it (C-10).
  let payeSalaryRecords = 0;
  let payeExtrasRecords = 0;
  for (const catId in payeRecordValues) {
    const arr = payeRecordValues[catId];
    const sum = arr ? arr.reduce((a, b) => a + b, 0) : 0;
    if (catId === "paye_pension") {
      payeExpenses += sum;
    } else if (catId === "paye_salary") {
      payeSalaryRecords += sum;
    } else {
      payeExtrasRecords += sum;
    }
  }
  payeIncomeGross = payeSalaryRecords + payeExtrasRecords;

  // Sum Savings & Dividends
  for (const catId in savingsRecordValues) {
    const arr = savingsRecordValues[catId];
    const sum = arr ? arr.reduce((a, b) => a + b, 0) : 0;
    if (catId === "savings_interest") {
      savingsInterestGross += sum;
    } else if (catId === "isa_interest") {
      isaInterestGross += sum;
    } else if (catId === "dividend_income") {
      dividendIncomeGross += sum;
    } else if (catId === "investment_fees") {
      savingsExpenses += sum;
    }
  }

  // Effective PAYE salary. A salary record for the whole year (frequency "annual") is the year's
  // salary and stands in for the saved one. Otherwise the salary is built month by month: a month
  // with a logged payslip uses what was logged, and every other month uses a twelfth of the saved
  // salary, so one payslip never replaces the whole salary. Bonus, commission, overtime and benefit
  // records add to that base (C-10); logged employee pension comes off.
  //
  // Months are counted by pay date, not by bucket: someone paid on the 1st has twelve pay dates in
  // the tax year, 1 May to 1 April, and the 1 April payslip is bucketed into March beside the
  // 1 March one. Counting buckets would leave April looking unpaid and add a thirteenth month.
  const hasAnnualSalaryRecord = records.some(
    (r) =>
      r.source === "paye" &&
      r.category === "paye_salary" &&
      r.frequency === "annual" &&
      getRecordAnnualTotalForTaxYear(r, taxYear) > 0,
  );
  const paidMonths = new Set<string>();
  for (const r of records) {
    if (r.source !== "paye" || r.category !== "paye_salary") continue;
    if (r.frequency === "one-off") {
      if (getRecordAnnualTotalForTaxYear(r, taxYear) > 0) paidMonths.add(r.date.substring(0, 7));
    } else if (r.frequency === "monthly") {
      for (const month of months) if (getRecordValueForMonth(r, month) > 0) paidMonths.add(month);
    }
  }
  const monthsWithoutPayslip = Math.max(0, months.length - paidMonths.size);
  const basePayeSalary = hasAnnualSalaryRecord
    ? payeSalaryRecords
    : payeSalaryRecords + (payeSalary * monthsWithoutPayslip) / months.length;
  const effectivePayeSalary = Math.max(0, basePayeSalary + payeExtrasRecords - payeExpenses);

  // Profits as recorded (for profit and loss reporting; no allowance).
  const rentalProfitBeforeInterest = Math.max(0, rentalIncomeGross - rentalExpensesExclInterest);
  const rentalProfitPostInterest = Math.max(0, rentalProfitBeforeInterest - rentalMortgageInterest);
  // Taxable trading profit: the recorded costs or the trading allowance, whichever is larger.
  const trading = calculateTradingProfit(seIncomeGross, seExpenses, yearRules);
  const seProfit = trading.profit;

  // Ownership shares, per record: the share of the account a record is linked to, else the
  // share for unlinked records (owner decision 6). Without `rentalShares` one share applies to
  // every record, as before. All of a person's UK lettings are one property business, so a loss
  // on one property is set against the profit on another before the share is compared.
  const region = options.region ?? "ENGLAND_NI_WALES";
  const rentalShares = options.rentalShares;
  const shareOf = (record: TaxRecordFields): number => {
    if (!rentalShares) return propertyOwnershipShare;
    const linked =
      record.accountId !== null && record.accountId !== undefined
        ? rentalShares.byAccountId[record.accountId]
        : undefined;
    return linked ?? rentalShares.unlinked.share;
  };
  const unlinkedShare = rentalShares ? rentalShares.unlinked.share : propertyOwnershipShare;
  const rentalCategoryIds = new Set(RENTAL_CATEGORIES.map((c) => c.id));
  let rentalIncomeGrossShare = 0;
  let rentalExpensesExclInterestShare = 0;
  let rentalMortgageInterestShare = 0;
  for (const record of records) {
    if (record.source !== "rental" || isFinanceCostsBroughtForwardRecord(record)) continue;
    if (!rentalCategoryIds.has(record.category)) continue;
    const yearly = getRecordAnnualTotalForTaxYear(record, taxYear) * (shareOf(record) / 100);
    if (record.category === "rental_income") rentalIncomeGrossShare += yearly;
    else if (record.category === "mortgage_interest") rentalMortgageInterestShare += yearly;
    else rentalExpensesExclInterestShare += yearly;
  }
  const rentalProfitBeforeInterestShareRecorded = Math.max(
    0,
    rentalIncomeGrossShare - rentalExpensesExclInterestShare,
  );

  // Property income can be taxed two ways. With the recorded costs, finance costs earn the
  // Section 24 credit. With the property allowance, neither the costs nor the finance cost credit
  // can be claimed. A return can use either, so the estimate works out both and keeps the one with
  // the lower total. With no rental income both routes are the same.
  // Finance costs not relieved in earlier years join this year's (ITTOIA 2005 s.274A(3)(c)). The
  // amount is already the person's own, so the ownership share is not applied to it.
  const financeCostsBroughtForward =
    Math.max(0, options.financeCostsBroughtForward ?? 0) + financeCostsBroughtForwardRecords;
  const withCosts = assess({
    rentalProfitBeforeInterestShare: rentalProfitBeforeInterestShareRecorded,
    creditableFinanceCosts: rentalMortgageInterestShare + financeCostsBroughtForward,
    propertyAllowanceUsed: 0,
  });
  const allowanceRoute = calculatePropertyProfit(rentalIncomeGrossShare, 0, yearRules);
  if (allowanceRoute.allowanceUsed === 0) return { ...withCosts, propertyRoutesTie: true };
  const withAllowance = assess({
    rentalProfitBeforeInterestShare: allowanceRoute.profit,
    creditableFinanceCosts: 0,
    propertyAllowanceUsed: allowanceRoute.allowanceUsed,
  });
  // On a tie the recorded costs are kept.
  if (withAllowance.totalTaxDue === withCosts.totalTaxDue) {
    return { ...withCosts, propertyRoutesTie: true };
  }
  return withAllowance.totalTaxDue < withCosts.totalTaxDue ? withAllowance : withCosts;

  function assess(property: {
    rentalProfitBeforeInterestShare: number;
    /** Finance costs that earn the Section 24 credit on this route, brought-forward included. */
    creditableFinanceCosts: number;
    propertyAllowanceUsed: number;
    /** The same year without the rent, used only to split the bill. */
    isWithoutRental?: boolean;
  }): TaxCalculationResult {
    const { rentalProfitBeforeInterestShare, creditableFinanceCosts } = property;

    // Net taxable savings interest before PSA
    // Interest is taxed on the full amount arising (ITTOIA 2005 s.370): an individual's
    // investment fees are not deducted, so `savingsExpenses` is reported but not used here.
    const netTaxableSavingsInterest = Math.max(0, savingsInterestGross);

    // 2. Tax Calculations
    // Total income for tax rate and allowance determination
    const nonSavingsGross = effectivePayeSalary + seProfit + rentalProfitBeforeInterestShare;
    const totalGrossIncome = nonSavingsGross + netTaxableSavingsInterest + dividendIncomeGross;

    // Personal Allowance, tapered above the year's taper start.
    const taperedAllowance = (income: number): number =>
      calculatePersonalAllowanceForYear(income, yearRules);
    const personalAllowance = taperedAllowance(totalGrossIncome);

    // Tax the employer deducts under PAYE: the employer only sees the salary, so it is taxed with
    // the allowance tapered by the salary alone. Any further taper from other income is part of the
    // tax still to pay, not of the PAYE already paid.
    const payeTaxable = Math.max(0, effectivePayeSalary - taperedAllowance(effectivePayeSalary));
    const payeTaxDue = incomeTaxOn(payeTaxable);

    // The allowance is set against non-savings income first, then savings, then dividends.
    const allowanceOnNonSavings = Math.min(personalAllowance, nonSavingsGross);
    const allowanceOnSavings = Math.min(
      personalAllowance - allowanceOnNonSavings,
      netTaxableSavingsInterest,
    );
    const allowanceOnDividends = Math.min(
      personalAllowance - allowanceOnNonSavings - allowanceOnSavings,
      dividendIncomeGross,
    );
    const savingsAfterAllowance = netTaxableSavingsInterest - allowanceOnSavings;
    const dividendsAfterAllowance = dividendIncomeGross - allowanceOnDividends;

    // Personal Savings Allowance (PSA)
    // Basic rate taxpayers: £1,000; Higher rate: £500; Additional rate: £0
    let personalSavingsAllowance = yearRules.savings.psaBasic;
    // Band is chosen from taxable income (after the tapered personal allowance), against the
    // shared EWNI thresholds: higher above basicRateBandWidth, additional above additionalRateThreshold.
    const taxableForPsa = Math.max(0, totalGrossIncome - personalAllowance);
    if (taxableForPsa > ewni.additionalRateThreshold) {
      personalSavingsAllowance = yearRules.savings.psaAdditional;
    } else if (taxableForPsa > ewni.basicRateBandWidth) {
      personalSavingsAllowance = yearRules.savings.psaHigher;
    }

    // Dividend Allowance (per-year table)
    const dividendAllowance = yearRules.dividends.allowance;

    // Tax on non-savings + non-dividends
    const nonSavingsTaxable = Math.max(0, nonSavingsGross - personalAllowance);

    // Starting rate for savings (0%): 5,000 less non-savings income above the allowance. It and the
    // PSA are 0% bands that still occupy band space, so the savings left over stack above them.
    const startingRateUsed = Math.min(
      Math.max(0, yearRules.savings.startingRateBand - nonSavingsTaxable),
      savingsAfterAllowance,
    );
    const psaUsed = Math.min(personalSavingsAllowance, savingsAfterAllowance - startingRateUsed);
    const taxableSavingsInterest = savingsAfterAllowance - startingRateUsed - psaUsed;
    const dividendAllowanceUsed = Math.min(dividendsAfterAllowance, dividendAllowance);
    const taxableDividends = dividendsAfterAllowance - dividendAllowanceUsed;
    const nonSavingsIncomeTaxBeforeCredit = incomeTaxOn(nonSavingsTaxable);

    // Section 24 Rental Property Finance Tax Credit
    const maxCreditBase = Math.min(
      creditableFinanceCosts,
      rentalProfitBeforeInterestShare,
      nonSavingsTaxable,
    );
    const rentalPropertyTaxCredit = Math.max(0, maxCreditBase * 0.2);
    // What is not relieved this year carries forward to the next (ITTOIA 2005 s.274AA(4)). On the
    // property allowance route no finance costs are relieved, so only the amount brought in
    // carries on: this year's costs are not deductible at all on that route.
    const financeCostsCarriedForward =
      property.propertyAllowanceUsed > 0
        ? financeCostsBroughtForward
        : Math.max(0, creditableFinanceCosts - maxCreditBase);

    // Non-savings tax without the rent. Without the rent the allowance is tapered by the other
    // income only, so the allowance the rent takes away (ITA 2007 s.35) counts against the rent,
    // not the salary or self-employment.
    const allowanceWithoutRental = taperedAllowance(
      totalGrossIncome - rentalProfitBeforeInterestShare,
    );
    const totalTaxableExclRental = Math.max(
      0,
      effectivePayeSalary + seProfit - allowanceWithoutRental,
    );
    const incomeTaxExclRental = incomeTaxOn(totalTaxableExclRental);

    // Income Tax on self-employed profit: the tax on the salary and the profit, with the
    // allowance tapered by those two only, minus the PAYE tax. The profit is non-savings income
    // and comes before savings and dividends (ITA 2007 s.16), so the allowance it takes away is
    // its own. The allowance savings and dividends take away (s.35, adjusted net income s.58) is
    // still taxed on the salary, because the allowance goes against non-savings income first; it
    // has its own line, so no tax is shown as self-employed when there is no self-employment.
    const taxOnSalaryAndProfit = incomeTaxOn(
      Math.max(
        0,
        effectivePayeSalary + seProfit - taperedAllowance(effectivePayeSalary + seProfit),
      ),
    );
    const seTaxDue = Math.max(0, taxOnSalaryAndProfit - payeTaxDue);
    const allowanceTaperTaxDue = Math.max(0, incomeTaxExclRental - taxOnSalaryAndProfit);

    // Class 4 National Insurance on self-employed profit: the main rate between the lower and
    // upper profits limits, the upper rate above.
    const seClass4NIDue = calculateClass4Ni(seProfit, yearRules);

    // Savings tax (stacked above non-savings income)
    let savingsTaxDue = 0;
    if (taxableSavingsInterest > 0) {
      const zeroRatedTop = nonSavingsTaxable + startingRateUsed + psaUsed;
      savingsTaxDue = Math.max(
        0,
        ukIncomeTaxOn(zeroRatedTop + taxableSavingsInterest) - ukIncomeTaxOn(zeroRatedTop),
      );
    }

    // Dividend tax (stacked at top of all income, taxed at the year's dividend rates)
    let dividendTaxDue = 0;
    if (taxableDividends > 0) {
      const priorTaxable = nonSavingsTaxable + savingsAfterAllowance;
      dividendTaxDue = calculateDividendTaxForStack(
        priorTaxable,
        taxableDividends,
        dividendAllowanceUsed,
        yearRules,
      );
    }

    // The tax on rent is the tax with the rent minus the tax without it. The rent is non-savings
    // income, and savings and dividends stack above it (ITA 2007 s.16), so the rent can also push
    // them into a higher band, shrink the starting rate for savings (s.12) and lower the Personal
    // Savings Allowance (s.12B). That extra tax counts against the rent too, so the savings and
    // dividend lines show what they would be without the rent. The parts add up to the same
    // total. "Tax on rent" has no statutory definition: this split is a chosen convention.
    const withoutRental =
      property.rentalProfitBeforeInterestShare > 0 && !property.isWithoutRental
        ? assess({
            rentalProfitBeforeInterestShare: 0,
            creditableFinanceCosts: 0,
            propertyAllowanceUsed: 0,
            isWithoutRental: true,
          })
        : null;
    const savingsTaxShown = withoutRental ? withoutRental.savingsTaxDue : savingsTaxDue;
    const dividendTaxShown = withoutRental ? withoutRental.dividendTaxDue : dividendTaxDue;
    const rentalPropertyTaxDueBeforeCredit = Math.max(
      0,
      nonSavingsIncomeTaxBeforeCredit -
        incomeTaxExclRental +
        (savingsTaxDue - savingsTaxShown) +
        (dividendTaxDue - dividendTaxShown),
    );
    const rentalPropertyTaxDueAfterCredit = Math.max(
      0,
      rentalPropertyTaxDueBeforeCredit - rentalPropertyTaxCredit,
    );

    // The credit is a tax reduction at Step 6, allowed only so far as there is tax (ITA 2007
    // s.26(1)(a), s.29(2)): it comes off the whole Income Tax bill, savings and dividends
    // included. On England, Wales and NI bands the non-savings tax always covers it; at the
    // Scottish 19% starter rate the 20% credit can be larger than the tax on the rent.
    const totalIncomeTaxDue = Math.max(
      0,
      nonSavingsIncomeTaxBeforeCredit + savingsTaxDue + dividendTaxDue - rentalPropertyTaxCredit,
    );
    const totalNIDue = seClass4NIDue;
    const totalTaxDue = totalIncomeTaxDue + totalNIDue;

    const netAdditionalTaxToPay = Math.max(0, totalTaxDue - payeTaxDue);
    const estimatedRepayment = Math.max(0, payeTaxDue - totalTaxDue);
    const totalTaxable = Math.max(0, totalGrossIncome - personalAllowance);

    return {
      taxYear,
      payeSalary: effectivePayeSalary,
      propertyOwnershipShare: unlinkedShare,

      payeIncomeGross,
      payeExpenses,
      effectivePayeSalary,

      rentalIncomeGross,
      rentalExpensesExclInterest,
      rentalMortgageInterest,
      rentalProfitBeforeInterest,
      rentalProfitPostInterest,
      rentalIncomeGrossShare,
      rentalExpensesExclInterestShare,
      rentalMortgageInterestShare,
      rentalProfitBeforeInterestShare,
      rentalProfitPostInterestShare: Math.max(
        0,
        rentalProfitBeforeInterestShareRecorded - rentalMortgageInterestShare,
      ),

      seIncomeGross,
      seExpenses,
      seProfit,
      tradingAllowanceUsed: trading.allowanceUsed,
      propertyAllowanceUsed: property.propertyAllowanceUsed,
      propertyRoutesTie: false,

      savingsInterestGross,
      isaInterestGross,
      dividendIncomeGross,
      savingsExpenses,
      personalSavingsAllowance,
      dividendAllowance,
      taxableSavingsInterest,
      taxableDividends,
      savingsTaxDue: savingsTaxShown,
      dividendTaxDue: dividendTaxShown,

      totalGrossIncome,
      personalAllowance,
      totalTaxableIncome: totalTaxable,
      payeTaxDue,
      seTaxDue,
      allowanceTaperTaxDue,
      seClass4NIDue,
      rentalPropertyTaxDueBeforeCredit,
      rentalPropertyTaxCredit,
      rentalPropertyTaxDueAfterCredit,
      financeCostsBroughtForward,
      financeCostsCarriedForward,
      totalIncomeTaxDue,
      totalNIDue,
      totalTaxDue,
      netAdditionalTaxToPay,
      estimatedRepayment,
      payments: calculateSelfAssessmentPayments({
        taxYear,
        bill: netAdditionalTaxToPay,
        taxDeductedAtSource: payeTaxDue,
      }),
    };
  }

  /** Income Tax on taxable non-savings income, at the year's bands for the person's region. */
  function incomeTaxOn(taxable: number): number {
    return calculateIncomeTaxOnTaxable(taxable, yearRules, region).total;
  }

  /**
   * Income Tax at the UK rates on the UK bands, which savings interest uses whatever the region
   * (ITA 2007 s.11A(1A): Scottish rates are for non-savings income only).
   */
  function ukIncomeTaxOn(taxable: number): number {
    return calculateIncomeTaxOnTaxable(taxable, yearRules, "ENGLAND_NI_WALES").total;
  }
}

function calculateDividendTaxForStack(
  priorTaxable: number,
  dividends: number,
  allowanceUsed: number,
  rules: UkTaxYearRules,
): number {
  if (dividends <= 0) return 0;
  const rates = rules.dividends;
  // Both are taxable-income thresholds, the same band edges calculateIncomeTaxOnTaxable uses.
  const basicThreshold = rules.ewni.basicRateBandWidth;
  const higherThreshold = rules.ewni.additionalRateThreshold;

  const basicDividendRate = rates.basicRate;
  const higherDividendRate = rates.higherRate;
  const additionalDividendRate = rates.additionalRate;

  let tax = 0;
  // The dividend allowance (taxed at 0%) still occupies band space, so taxable dividends stack
  // above priorTaxable + allowanceUsed. Source: https://www.gov.uk/tax-on-dividends
  const divStart = priorTaxable + allowanceUsed;
  const divEnd = divStart + dividends;

  // Portion falling in basic rate band (<= basicThreshold)
  if (divStart < basicThreshold) {
    const inBasic = Math.min(divEnd, basicThreshold) - divStart;
    tax += inBasic * basicDividendRate;
  }

  // Portion falling in higher rate band (> basicThreshold and <= higherThreshold)
  if (divEnd > basicThreshold && divStart < higherThreshold) {
    const higherStart = Math.max(divStart, basicThreshold);
    const higherEnd = Math.min(divEnd, higherThreshold);
    tax += (higherEnd - higherStart) * higherDividendRate;
  }

  // Portion falling in additional rate band (> higherThreshold)
  if (divEnd > higherThreshold) {
    const addStart = Math.max(divStart, higherThreshold);
    tax += (divEnd - addStart) * additionalDividendRate;
  }

  return tax;
}

/**
 * Income outside PAYE and its costs, as the estimate taxes them: rent and rental costs at the
 * person's share, self-employed income and costs, taxable savings interest and dividends.
 * Investment fees are not deducted for tax (ITTOIA 2005 s.370), so they are not costs here. ISA
 * interest is tax-free and finance costs brought forward are not a cost of
 * the year, so neither is counted. The one figure for the Self Assessment headline strip and the
 * Dashboard's untaxed income (SA-9).
 */
export function incomeOutsidePaye(
  result: Pick<
    TaxCalculationResult,
    | "rentalIncomeGrossShare"
    | "seIncomeGross"
    | "savingsInterestGross"
    | "dividendIncomeGross"
    | "rentalExpensesExclInterestShare"
    | "rentalMortgageInterestShare"
    | "seExpenses"
  >,
): { income: number; costs: number } {
  return {
    income:
      result.rentalIncomeGrossShare +
      result.seIncomeGross +
      result.savingsInterestGross +
      result.dividendIncomeGross,
    costs:
      result.rentalExpensesExclInterestShare +
      result.rentalMortgageInterestShare +
      result.seExpenses,
  };
}
