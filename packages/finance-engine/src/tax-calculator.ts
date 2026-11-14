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
    name: "Deductible investment management fees",
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

  // Savings & Dividends totals
  savingsInterestGross: number;
  isaInterestGross: number;
  dividendIncomeGross: number;
  savingsExpenses: number;
  personalSavingsAllowance: number;
  dividendAllowance: number;
  taxableSavingsInterest: number;
  taxableDividends: number;
  savingsTaxDue: number;
  dividendTaxDue: number;

  // Combined taxable income
  totalGrossIncome: number; // PAYE + SE Profit + Rental Profit Before Interest Share + Savings + Dividends
  personalAllowance: number;
  totalTaxableIncome: number;

  // Tax breakdowns
  payeTaxDue: number; // Base tax on PAYE salary alone
  seTaxDue: number;
  seClass4NIDue: number;
  rentalPropertyTaxDueBeforeCredit: number;
  rentalPropertyTaxCredit: number; // Section 24 credit
  rentalPropertyTaxDueAfterCredit: number;

  totalIncomeTaxDue: number;
  totalNIDue: number;
  totalTaxDue: number; // Total combined tax due (Income Tax + NI)
  netAdditionalTaxToPay: number; // totalTaxDue - PAYE tax already paid
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
  const hasAnnualSalaryRecord = records.some(
    (r) =>
      r.source === "paye" &&
      r.category === "paye_salary" &&
      r.frequency === "annual" &&
      getRecordAnnualTotalForTaxYear(r, taxYear) > 0,
  );
  const salaryByMonth = payeRecordValues.paye_salary ?? [];
  const monthsWithoutPayslip = months.filter((_month, i) => !((salaryByMonth[i] ?? 0) > 0)).length;
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

  // Ownership shares
  const shareFactor = propertyOwnershipShare / 100;
  const rentalIncomeGrossShare = rentalIncomeGross * shareFactor;
  const rentalExpensesExclInterestShare = rentalExpensesExclInterest * shareFactor;
  const rentalMortgageInterestShare = rentalMortgageInterest * shareFactor;

  // Property income can be taxed two ways. With the recorded costs, finance costs earn the
  // Section 24 credit. With the property allowance, neither the costs nor the finance cost credit
  // can be claimed. A return can use either, so the estimate works out both and keeps the one with
  // the lower total. With no rental income both routes are the same.
  const withCosts = assess({
    rentalProfitBeforeInterestShare: rentalProfitBeforeInterest * shareFactor,
    creditableFinanceCosts: rentalMortgageInterestShare,
    propertyAllowanceUsed: 0,
  });
  const allowanceRoute = calculatePropertyProfit(rentalIncomeGrossShare, 0, yearRules);
  if (allowanceRoute.allowanceUsed === 0) return withCosts;
  const withAllowance = assess({
    rentalProfitBeforeInterestShare: allowanceRoute.profit,
    creditableFinanceCosts: 0,
    propertyAllowanceUsed: allowanceRoute.allowanceUsed,
  });
  return withAllowance.totalTaxDue < withCosts.totalTaxDue ? withAllowance : withCosts;

  function assess(property: {
    rentalProfitBeforeInterestShare: number;
    /** Finance costs that earn the Section 24 credit on this route. */
    creditableFinanceCosts: number;
    propertyAllowanceUsed: number;
  }): TaxCalculationResult {
    const { rentalProfitBeforeInterestShare, creditableFinanceCosts } = property;

    // Net taxable savings interest before PSA
    const netTaxableSavingsInterest = Math.max(0, savingsInterestGross - savingsExpenses);

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

    // Allocate Income Tax components
    const totalTaxableExclRental = Math.max(0, effectivePayeSalary + seProfit - personalAllowance);
    const incomeTaxExclRental = incomeTaxOn(totalTaxableExclRental);

    const rentalPropertyTaxDueBeforeCredit = Math.max(
      0,
      nonSavingsIncomeTaxBeforeCredit - incomeTaxExclRental,
    );
    const rentalPropertyTaxDueAfterCredit = Math.max(
      0,
      rentalPropertyTaxDueBeforeCredit - rentalPropertyTaxCredit,
    );

    const seTaxDue = Math.max(0, incomeTaxExclRental - payeTaxDue);

    // Class 4 National Insurance on self-employed profit: the main rate between the lower and
    // upper profits limits, the upper rate above.
    const seClass4NIDue = calculateClass4Ni(seProfit, yearRules);

    // Savings tax (stacked above non-savings income)
    let savingsTaxDue = 0;
    if (taxableSavingsInterest > 0) {
      const zeroRatedTop = nonSavingsTaxable + startingRateUsed + psaUsed;
      savingsTaxDue = Math.max(
        0,
        incomeTaxOn(zeroRatedTop + taxableSavingsInterest) - incomeTaxOn(zeroRatedTop),
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

    const totalNonSavingsIncomeTax = Math.max(
      0,
      nonSavingsIncomeTaxBeforeCredit - rentalPropertyTaxCredit,
    );
    const totalIncomeTaxDue = totalNonSavingsIncomeTax + savingsTaxDue + dividendTaxDue;
    const totalNIDue = seClass4NIDue;
    const totalTaxDue = totalIncomeTaxDue + totalNIDue;

    const netAdditionalTaxToPay = Math.max(0, totalTaxDue - payeTaxDue);
    const totalTaxable = Math.max(0, totalGrossIncome - personalAllowance);

    return {
      taxYear,
      payeSalary: effectivePayeSalary,
      propertyOwnershipShare,

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
      rentalProfitPostInterestShare: rentalProfitPostInterest * shareFactor,

      seIncomeGross,
      seExpenses,
      seProfit,
      tradingAllowanceUsed: trading.allowanceUsed,
      propertyAllowanceUsed: property.propertyAllowanceUsed,

      savingsInterestGross,
      isaInterestGross,
      dividendIncomeGross,
      savingsExpenses,
      personalSavingsAllowance,
      dividendAllowance,
      taxableSavingsInterest,
      taxableDividends,
      savingsTaxDue,
      dividendTaxDue,

      totalGrossIncome,
      personalAllowance,
      totalTaxableIncome: totalTaxable,
      payeTaxDue,
      seTaxDue,
      seClass4NIDue,
      rentalPropertyTaxDueBeforeCredit,
      rentalPropertyTaxCredit,
      rentalPropertyTaxDueAfterCredit,
      totalIncomeTaxDue,
      totalNIDue,
      totalTaxDue,
      netAdditionalTaxToPay,
      payments: calculateSelfAssessmentPayments({
        taxYear,
        bill: netAdditionalTaxToPay,
        taxDeductedAtSource: payeTaxDue,
      }),
    };
  }

  /** Income Tax on taxable non-savings income, at the year's England, Wales and NI bands. */
  function incomeTaxOn(taxable: number): number {
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
