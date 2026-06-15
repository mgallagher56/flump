import {
  buildLegacyUKConfig,
  getAvailableUKTaxYears,
  type UKLegacyTaxYearConfig,
} from "./taxRules";

export interface TaxRecord {
  id: string;
  userId: string;
  type: "income" | "expense";
  source: "self-employed" | "rental";
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
  getAvailableUKTaxYears().map((year) => [year, buildLegacyUKConfig(year)]),
);

export const RENTAL_CATEGORIES = [
  { id: "rental_income", name: "Rental Income", type: "income" },
  { id: "rent_rates_insurance", name: "Rent, rates, insurance, ground rents", type: "expense" },
  {
    id: "legal_management_fees",
    name: "Legal, management and other professional fees",
    type: "expense",
  },
  { id: "repairs_maintenance", name: "Property repairs and maintenance", type: "expense" },
  { id: "replace_domestic_items", name: "Replace domestic items", type: "expense" },
  { id: "services_costs", name: "Costs of services provided", type: "expense" },
  {
    id: "mortgage_interest",
    name: "Mortgage Interest / Residential property finance",
    type: "expense",
  },
];

export const SELF_EMPLOYED_CATEGORIES = [
  { id: "self_employed_income", name: "Self-Employed Turnover/Income", type: "income" },
  { id: "office_costs", name: "Office, stationery, phone, internet, postage", type: "expense" },
  { id: "travel_costs", name: "Car, van, travel expenses, fuel, parking", type: "expense" },
  { id: "clothing_costs", name: "Uniforms, protective clothing", type: "expense" },
  { id: "staff_costs", name: "Employee salaries, subcontractor costs", type: "expense" },
  { id: "premises_costs", name: "Rent, rates, power, insurance", type: "expense" },
  {
    id: "legal_finance_fees",
    name: "Accountant, solicitor, bank charges, business insurance",
    type: "expense",
  },
  { id: "advertising_marketing", name: "Website, ads, marketing", type: "expense" },
  { id: "stock_raw_materials", name: "Cost of goods sold, stock, raw materials", type: "expense" },
  { id: "other_expenses", name: "Other business expenses", type: "expense" },
];

export function getTaxYearForDate(dateStr: string): string {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 1-indexed
  if (month >= 4) {
    return `${year}/${(year + 1).toString().slice(-2)}`;
  }
  return `${year - 1}/${year.toString().slice(-2)}`;
}

// Generate the 12 calendar months YYYY-MM for a tax year YYYY/YY
export function getMonthsForTaxYear(taxYear: string): string[] {
  const parts = taxYear.split("/");
  const startYear = Number.parseInt(parts[0]);
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

export interface TaxCalculationResult {
  taxYear: string;
  payeSalary: number;
  propertyOwnershipShare: number;

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

  // Combined taxable income
  totalGrossIncome: number; // PAYE + SE Profit + Rental Profit Before Interest Share
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
  const config = TAX_YEARS[taxYear] || TAX_YEARS["2024/25"];
  const months = getMonthsForTaxYear(taxYear);

  // 1. Calculate Gross Rental and Self Employed Totals
  let rentalIncomeGross = 0;
  let rentalExpensesExclInterest = 0;
  let rentalMortgageInterest = 0;

  let seIncomeGross = 0;
  let seExpenses = 0;

  const rentalRecordValues: Record<string, number[]> = {};
  const seRecordValues: Record<string, number[]> = {};

  // Setup containers
  for (const cat of RENTAL_CATEGORIES) {
    rentalRecordValues[cat.id] = months.map(() => 0);
  }
  for (const cat of SELF_EMPLOYED_CATEGORIES) {
    seRecordValues[cat.id] = months.map(() => 0);
  }

  for (const record of records) {
    for (let i = 0; i < months.length; i++) {
      const month = months[i];
      const val = getRecordValueForMonth(record, month);
      if (val > 0) {
        if (record.source === "rental") {
          if (rentalRecordValues[record.category]) {
            rentalRecordValues[record.category][i] += val;
          }
        } else if (record.source === "self-employed") {
          if (seRecordValues[record.category]) {
            seRecordValues[record.category][i] += val;
          }
        }
      }
    }
  }

  // Sum categories
  for (const catId in rentalRecordValues) {
    const sum = rentalRecordValues[catId].reduce((a, b) => a + b, 0);
    if (catId === "rental_income") {
      rentalIncomeGross += sum;
    } else if (catId === "mortgage_interest") {
      rentalMortgageInterest += sum;
    } else {
      rentalExpensesExclInterest += sum;
    }
  }

  for (const catId in seRecordValues) {
    const sum = seRecordValues[catId].reduce((a, b) => a + b, 0);
    if (catId === "self_employed_income") {
      seIncomeGross += sum;
    } else {
      seExpenses += sum;
    }
  }

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

  // 2. Tax Calculations
  // Total income for tax rate determination (PAYE + SE Profit + Rental Profit before interest deduction)
  const totalGrossIncome = payeSalary + seProfit + rentalProfitBeforeInterestShare;

  // Personal Allowance with Tapering
  let personalAllowance = config.personalAllowance;
  if (totalGrossIncome > 100000) {
    const taper = Math.floor((totalGrossIncome - 100000) / 2);
    personalAllowance = Math.max(0, config.personalAllowance - taper);
  }

  // Tax on PAYE alone (baseline already paid)
  const payeTaxable = Math.max(0, payeSalary - personalAllowance);
  const payeTaxDue = calculateIncomeTaxForTaxable(payeTaxable, config);

  // Total Income Tax on ALL income
  const totalTaxable = Math.max(0, totalGrossIncome - personalAllowance);
  const totalIncomeTaxDueBeforeCredit = calculateIncomeTaxForTaxable(totalTaxable, config);

  // Section 24 Rental Property Finance Tax Credit
  // Capped at 20% of lower of:
  // - Mortgage interest share
  // - Rental profit before interest share
  // - Total taxable income exceeding personal allowance
  const maxCreditBase = Math.min(
    rentalMortgageInterestShare,
    rentalProfitBeforeInterestShare,
    totalTaxable,
  );
  const rentalPropertyTaxCredit = Math.max(0, maxCreditBase * 0.2);

  // Allocate Income Tax components
  // To get individual tax elements, we stack them:
  // - PAYE at the bottom
  // - Self Employed in the middle
  // - Rental profit at the top
  const totalTaxableExclRental = Math.max(0, payeSalary + seProfit - personalAllowance);
  const incomeTaxExclRental = calculateIncomeTaxForTaxable(totalTaxableExclRental, config);

  const rentalPropertyTaxDueBeforeCredit = Math.max(
    0,
    totalIncomeTaxDueBeforeCredit - incomeTaxExclRental,
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

  const totalIncomeTaxDue = Math.max(0, totalIncomeTaxDueBeforeCredit - rentalPropertyTaxCredit);
  const totalNIDue = seClass4NIDue;
  const totalTaxDue = totalIncomeTaxDue + totalNIDue;

  const netAdditionalTaxToPay = Math.max(0, totalTaxDue - payeTaxDue);

  return {
    taxYear,
    payeSalary,
    propertyOwnershipShare,
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

  // Basic rate band limit is config.basicRateBand
  // Higher rate band is from basicRateBand to (higherRateLimit - personalAllowance)
  // Let's use the standard basicRateBand and higher rate band limit
  const basicBandTax = Math.min(taxable, config.basicRateBand) * 0.2;

  // Higher rate band width is standardly basicRateBand to additional rate threshold (usually 125,140 or 150,000 depending on tax year)
  // Let's check config.higherRateLimit. The threshold for additional rate is higherRateLimit.
  // Taxable threshold for additional rate = higherRateLimit - (personalAllowance at 0) = higherRateLimit.
  // Wait, if personal allowance is tapered to 0, taxable income matches total income.
  // Let's calculate exactly based on band widths:
  // Band 1 (Basic Rate): 0 to config.basicRateBand -> 20%
  // Band 2 (Higher Rate): config.basicRateBand to (config.higherRateLimit - 12570) -> 40%
  // Band 3 (Additional Rate): everything above Band 2 -> 45%
  // Let's be accurate for the higher rate threshold:
  // In 24/25, Higher rate threshold is 50,270. With 12,570 personal allowance, that is 37,700 taxable.
  // Additional rate threshold is 125,140. That is 125,140 taxable (as personal allowance is 0 here).
  // So the higher rate band taxable width is 125,140 - 37,700 = 87,440.
  // Let's check: 37,700 + 87,440 = 125,140.
  // Let's use the higher rate band limit directly from config:
  // Let's calculate:
  const higherBandMaxTaxable =
    config.higherRateLimit - (config.personalAllowance === 12500 ? 12500 : 12570); // Standard higher rate threshold minus standard personal allowance
  const higherBandWidth = higherBandMaxTaxable - config.basicRateBand;

  const higherBandTax =
    Math.max(0, Math.min(taxable - config.basicRateBand, higherBandWidth)) * 0.4;
  const additionalBandTax = Math.max(0, taxable - higherBandMaxTaxable) * 0.45;

  return basicBandTax + higherBandTax + additionalBandTax;
}
