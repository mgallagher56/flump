import {
  buildLegacyUKConfig,
  getAvailableUKTaxYears,
  type UKLegacyTaxYearConfig,
} from "./tax-rules.js";
import {
  getUkTaxYearForDate,
  getUkTaxYearRules,
  isSupportedUkTaxYear,
  type UkDividendRules,
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
  receiptData: string | null;
  createdAt: string;
  updatedAt: string;
}

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
 * Legacy shape kept for backwards compatibility with calculateUKTax().
 * All values now sourced from taxRules.ts via buildLegacyUKConfig().
 */
export type TaxYearConfig = UKLegacyTaxYearConfig;

/**
 * TAX_YEARS is now derived from the canonical taxRules.ts data file.
 * This record is rebuilt lazily on first access and cached.
 */
export const TAX_YEARS: Record<string, TaxYearConfig> = Object.fromEntries(
  getAvailableUKTaxYears().map((year: string) => [year, buildLegacyUKConfig(year)]),
);

export const RENTAL_CATEGORIES = [
  { id: "rental_income", name: "Rental Income", type: "income" as const },
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
    name: "Mortgage Interest / Residential property finance",
    type: "expense" as const,
  },
];

export const SELF_EMPLOYED_CATEGORIES = [
  { id: "self_employed_income", name: "Self-Employed Turnover/Income", type: "income" as const },
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
  { id: "paye_salary", name: "Base PAYE Salary", type: "income" as const },
  { id: "paye_bonus", name: "Bonus, Commission & Overtime", type: "income" as const },
  { id: "paye_benefit", name: "Taxable Benefits in Kind (P11D)", type: "income" as const },
  { id: "paye_pension", name: "Employee Pension Contributions", type: "expense" as const },
];

export const SAVINGS_CATEGORIES = [
  { id: "savings_interest", name: "Taxable Bank & Savings Interest", type: "income" as const },
  { id: "dividend_income", name: "Dividends (Shares / Equity)", type: "income" as const },
  { id: "isa_interest", name: "Tax-Free ISA Interest / Returns", type: "income" as const },
  {
    id: "investment_fees",
    name: "Deductible Investment Management Fees",
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

// Generate the 12 calendar months YYYY-MM for a tax year YYYY/YY
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
export function getRecordValueForMonth(record: TaxRecord, monthYYYYMM: string): number {
  const amount =
    typeof record.amount === "string" ? Number.parseFloat(record.amount) : record.amount;
  if (!amount || Number.isNaN(amount)) return 0;
  const recordMonth = record.date.substring(0, 7);

  if (record.frequency === "one-off") {
    return recordMonth === monthYYYYMM ? amount : 0;
  }

  if (record.frequency === "monthly") {
    if (recordMonth <= monthYYYYMM) {
      if (!record.endDate || record.endDate.substring(0, 7) >= monthYYYYMM) {
        return amount;
      }
    }
    return 0;
  }

  if (record.frequency === "annual") {
    // Annual occurs on the anniversary month of the start date
    const startM = record.date.substring(5, 7);
    const currM = monthYYYYMM.substring(5, 7);
    if (startM === currM && recordMonth <= monthYYYYMM) {
      if (!record.endDate || record.endDate.substring(0, 7) >= monthYYYYMM) {
        return amount;
      }
    }
    return 0;
  }

  return 0;
}

export function getRecordAnnualTotalForTaxYear(record: TaxRecord, taxYear: string): number {
  const months = getMonthsForTaxYear(taxYear);
  let total = 0;
  for (const month of months) {
    total += getRecordValueForMonth(record, month);
  }
  return total;
}

export function isRecordActiveInTaxYear(record: TaxRecord, taxYear: string): boolean {
  return getRecordAnnualTotalForTaxYear(record, taxYear) > 0;
}

export function buildCopiedRecordForTaxYear(
  record: TaxRecord,
  targetTaxYear: string,
  amountOverride?: number,
): Omit<TaxRecord, "id" | "userId" | "createdAt" | "updatedAt"> {
  const sourceTaxYear = getTaxYearForDate(record.date);
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
    return `${y}-${parts[1]}-${parts[2]}`;
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
  seProfit: number;

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
}

export function calculateUKTax(
  taxYear: string,
  records: TaxRecord[],
  payeSalary: number,
  propertyOwnershipShare: number,
): TaxCalculationResult {
  const config = TAX_YEARS[taxYear] ?? TAX_YEARS["2024/25"] ?? buildLegacyUKConfig("2024/25");
  const months = getMonthsForTaxYear(taxYear);
  // Per-year dividend and savings tables (uk-tax-year.ts). Unknown years keep the
  // legacy fallback to 2024/25 used for `config` above.
  const yearRules = getUkTaxYearRules(isSupportedUkTaxYear(taxYear) ? taxYear : "2024/25");

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

  // Sum PAYE
  for (const catId in payeRecordValues) {
    const arr = payeRecordValues[catId];
    const sum = arr ? arr.reduce((a, b) => a + b, 0) : 0;
    if (catId === "paye_pension") {
      payeExpenses += sum;
    } else {
      payeIncomeGross += sum;
    }
  }

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

  // Effective PAYE salary: use logged records if provided, otherwise default to profile/param salary
  const effectivePayeSalary =
    payeIncomeGross > 0 ? Math.max(0, payeIncomeGross - payeExpenses) : payeSalary;

  // Calculate profits
  const rentalProfitBeforeInterest = Math.max(0, rentalIncomeGross - rentalExpensesExclInterest);
  const rentalProfitPostInterest = Math.max(0, rentalProfitBeforeInterest - rentalMortgageInterest);
  const seProfit = Math.max(0, seIncomeGross - seExpenses);

  // Ownership shares
  const shareFactor = propertyOwnershipShare / 100;
  const rentalIncomeGrossShare = rentalIncomeGross * shareFactor;
  const rentalExpensesExclInterestShare = rentalExpensesExclInterest * shareFactor;
  const rentalMortgageInterestShare = rentalMortgageInterest * shareFactor;
  const rentalProfitBeforeInterestShare = rentalProfitBeforeInterest * shareFactor;

  // Net taxable savings interest before PSA
  const netTaxableSavingsInterest = Math.max(0, savingsInterestGross - savingsExpenses);

  // 2. Tax Calculations
  // Total income for tax rate and allowance determination
  const nonSavingsGross = effectivePayeSalary + seProfit + rentalProfitBeforeInterestShare;
  const totalGrossIncome = nonSavingsGross + netTaxableSavingsInterest + dividendIncomeGross;

  // Personal Allowance with Tapering above £100,000
  let personalAllowance = config.personalAllowance;
  if (totalGrossIncome > 100000) {
    const taper = Math.floor((totalGrossIncome - 100000) / 2);
    personalAllowance = Math.max(0, config.personalAllowance - taper);
  }

  // Baseline PAYE tax (assumed deducted under PAYE)
  const payeTaxable = Math.max(0, effectivePayeSalary - personalAllowance);
  const payeTaxDue = calculateIncomeTaxForTaxable(payeTaxable, config);

  // Personal Savings Allowance (PSA)
  // Basic rate taxpayers: £1,000; Higher rate: £500; Additional rate: £0
  let personalSavingsAllowance = yearRules.savings.psaBasic;
  if (totalGrossIncome > config.higherRateLimit) {
    personalSavingsAllowance = yearRules.savings.psaAdditional;
  } else if (totalGrossIncome > (config.higherRateLimit === 125140 ? 50270 : 50000)) {
    personalSavingsAllowance = yearRules.savings.psaHigher;
  }

  // Dividend Allowance (per-year table)
  const dividendAllowance = yearRules.dividends.allowance;

  const taxableSavingsInterest = Math.max(0, netTaxableSavingsInterest - personalSavingsAllowance);
  const taxableDividends = Math.max(0, dividendIncomeGross - dividendAllowance);

  // Tax on non-savings + non-dividends
  const nonSavingsTaxable = Math.max(0, nonSavingsGross - personalAllowance);
  const nonSavingsIncomeTaxBeforeCredit = calculateIncomeTaxForTaxable(nonSavingsTaxable, config);

  // Section 24 Rental Property Finance Tax Credit
  const maxCreditBase = Math.min(
    rentalMortgageInterestShare,
    rentalProfitBeforeInterestShare,
    nonSavingsTaxable,
  );
  const rentalPropertyTaxCredit = Math.max(0, maxCreditBase * 0.2);

  // Allocate Income Tax components
  const totalTaxableExclRental = Math.max(0, effectivePayeSalary + seProfit - personalAllowance);
  const incomeTaxExclRental = calculateIncomeTaxForTaxable(totalTaxableExclRental, config);

  const rentalPropertyTaxDueBeforeCredit = Math.max(
    0,
    nonSavingsIncomeTaxBeforeCredit - incomeTaxExclRental,
  );
  const rentalPropertyTaxDueAfterCredit = Math.max(
    0,
    rentalPropertyTaxDueBeforeCredit - rentalPropertyTaxCredit,
  );

  const seTaxDue = Math.max(0, incomeTaxExclRental - payeTaxDue);

  // National Insurance Class 4 (on Self Employed profits)
  let seClass4NIDue = 0;
  if (seProfit > config.class4LowerLimit) {
    const niBasicBand = Math.min(
      seProfit - config.class4LowerLimit,
      config.class4UpperLimit - config.class4LowerLimit,
    );
    const niHigherBand = Math.max(0, seProfit - config.class4UpperLimit);
    seClass4NIDue = niBasicBand * config.class4BasicRate + niHigherBand * config.class4HigherRate;
  }

  // Savings tax (stacked above non-savings income)
  let savingsTaxDue = 0;
  if (taxableSavingsInterest > 0) {
    const totalWithSavings = nonSavingsTaxable + taxableSavingsInterest;
    const taxWithSavings = calculateIncomeTaxForTaxable(totalWithSavings, config);
    savingsTaxDue = Math.max(0, taxWithSavings - nonSavingsIncomeTaxBeforeCredit);
  }

  // Dividend tax (stacked at top of all income, taxed at the year's dividend rates)
  let dividendTaxDue = 0;
  if (taxableDividends > 0) {
    const priorTaxable = nonSavingsTaxable + taxableSavingsInterest;
    dividendTaxDue = calculateDividendTaxForStack(
      priorTaxable,
      taxableDividends,
      config,
      yearRules.dividends,
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
  };
}

function calculateIncomeTaxForTaxable(taxable: number, config: TaxYearConfig): number {
  if (taxable <= 0) return 0;

  const basicBandTax = Math.min(taxable, config.basicRateBand) * 0.2;
  const higherBandMaxTaxable =
    config.higherRateLimit - (config.personalAllowance === 12500 ? 12500 : 12570);
  const higherBandWidth = higherBandMaxTaxable - config.basicRateBand;

  const higherBandTax =
    Math.max(0, Math.min(taxable - config.basicRateBand, higherBandWidth)) * 0.4;
  const additionalBandTax = Math.max(0, taxable - higherBandMaxTaxable) * 0.45;

  return basicBandTax + higherBandTax + additionalBandTax;
}

function calculateDividendTaxForStack(
  priorTaxable: number,
  dividends: number,
  config: TaxYearConfig,
  rates: UkDividendRules,
): number {
  if (dividends <= 0) return 0;
  const basicThreshold = config.basicRateBand;
  const higherThreshold =
    config.higherRateLimit - (config.personalAllowance === 12500 ? 12500 : 12570);

  const basicDividendRate = rates.basicRate;
  const higherDividendRate = rates.higherRate;
  const additionalDividendRate = rates.additionalRate;

  let tax = 0;
  const divStart = priorTaxable;
  const divEnd = priorTaxable + dividends;

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
