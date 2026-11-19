import { calculateUKTax, type TaxRecordFields } from "./tax-calculator.js";
import type { Section24Input, Section24Result, UkTaxYear } from "./types.js";
import { getUkTaxYearRules, resolveUkTaxYear } from "./uk-tax-year.js";

const round2 = (n: number): number => Math.round(n * 100) / 100 + 0;

/** One rental figure for the whole year, filed in the tax year it belongs to. */
function annualRentalRecord(taxYear: UkTaxYear, category: string, amount: number): TaxRecordFields {
  return {
    id: `section24-${category}`,
    type: category === "rental_income" ? "income" : "expense",
    source: "rental",
    category,
    name: category,
    amount,
    frequency: "annual",
    date: `${taxYear.slice(0, 4)}-06-06`,
    endDate: null,
    notes: null,
  };
}

/**
 * Tax on rental income under Section 24, for the public calculator. It is the same estimate as
 * the signed-in Self Assessment page: the figures come from `calculateUKTax`, with the other
 * income treated as salary. So the property allowance (ITTOIA 2005 Part 7A), the finance cost
 * credit and its three limits (ITTOIA 2005 s.274AA) and the Personal Allowance taper (ITA 2007
 * s.35) are worked out in one place. England, Wales and Northern Ireland bands only.
 */
export function calculateSection24Tax(input: Section24Input): Section24Result {
  const taxYear = resolveUkTaxYear(input.taxYear);
  const sharePct = Math.min(100, Math.max(1, input.ownershipSharePct ?? 100));
  const rent = Math.max(0, input.grossRentalIncomeGbp);
  const costs = Math.max(0, input.allowableExpensesGbp);
  const interest = Math.max(0, input.mortgageInterestGbp);
  const otherIncome = Math.max(0, input.otherTaxableIncomeGbp);

  const ledger = calculateUKTax(
    taxYear,
    [
      annualRentalRecord(taxYear, "rental_income", rent),
      annualRentalRecord(taxYear, "repairs_maintenance", costs),
      annualRentalRecord(taxYear, "mortgage_interest", interest),
    ],
    otherIncome,
    sharePct,
  );

  const shareRentalIncome = round2(ledger.rentalIncomeGrossShare);
  const shareAllowableExpenses = round2(ledger.rentalExpensesExclInterestShare);
  const shareMortgageInterest = round2(ledger.rentalMortgageInterestShare);
  // Rent less costs, before interest: what the tax share is measured against.
  const netRentalProfitBeforeFinance = shareRentalIncome - shareAllowableExpenses;
  const profitBeforeFinance = Math.max(0, netRentalProfitBeforeFinance);
  // The profit actually taxed: rent less costs, or rent less the property allowance.
  const taxableRentalProfit = round2(ledger.rentalProfitBeforeInterestShare);

  const section24TaxCredit = round2(ledger.rentalPropertyTaxCredit);
  const grossRentalTaxLiability = round2(ledger.rentalPropertyTaxDueBeforeCredit);
  const netRentalTaxLiability = round2(ledger.rentalPropertyTaxDueAfterCredit);

  const effectiveRentalTaxRate =
    profitBeforeFinance > 0
      ? Math.round((netRentalTaxLiability / profitBeforeFinance) * 1000) / 10
      : 0;

  // When the Self Assessment bill is due, from the engine's payments (threshold and the share
  // already taken at source both apply).
  const payments = ledger.payments;
  const paymentOnAccount = round2(payments.paymentOnAccount);

  // Not floored: under Section 24 the tax is worked out before mortgage interest, so a landlord
  // can owe tax and still make a cash loss. The result shows that loss rather than £0.
  const actualCashProfit = netRentalProfitBeforeFinance - shareMortgageInterest;
  const rules = getUkTaxYearRules(taxYear);
  const isHigherRate = otherIncome >= rules.ewni.personalAllowance + rules.ewni.basicRateBandWidth;

  return {
    ownershipSharePct: Math.round(sharePct),
    shareRentalIncomeGbp: shareRentalIncome,
    shareAllowableExpensesGbp: shareAllowableExpenses,
    shareMortgageInterestGbp: shareMortgageInterest,
    netRentalProfitBeforeFinanceCostsGbp: round2(netRentalProfitBeforeFinance),
    taxableRentalProfitGbp: taxableRentalProfit,
    propertyAllowanceUsedGbp: round2(ledger.propertyAllowanceUsed),
    section24TaxCreditGbp: section24TaxCredit,
    netRentalTaxLiabilityGbp: netRentalTaxLiability,
    effectiveRentalTaxRatePct: effectiveRentalTaxRate,
    balancingPayment31JanGbp: round2(payments.balancingPayment),
    firstPaymentOnAccount31JanGbp: paymentOnAccount,
    totalDue31JanGbp: round2(payments.january.amount),
    secondPaymentOnAccount31JulyGbp: paymentOnAccount,
    totalDue31JulyGbp: round2(payments.july?.amount ?? 0),
    recommendedMonthlyTaxSetAsideGbp: round2(netRentalTaxLiability / 12),
    // Compatibility aliases
    actualCashProfit: round2(actualCashProfit),
    section24TaxableProfit: taxableRentalProfit,
    grossTaxOnProperty: grossRentalTaxLiability,
    financeCredit: section24TaxCredit,
    finalTaxDue: netRentalTaxLiability,
    effectiveTaxRate: effectiveRentalTaxRate,
    // Can be negative: a cash loss after tax (see `actualCashProfit`).
    netRentalIncomeAfterTax: round2(actualCashProfit - netRentalTaxLiability),
    isHigherRate,
  };
}

/**
 * Convenience calculator for Section 24 Landlord Tax tool.
 */
export function calculateSection24LandlordTax(
  employmentIncome: number,
  rentalIncome: number,
  mortgageInterest: number,
  allowableExpenses: number,
  ownershipSharePct = 100,
  taxYear?: UkTaxYear,
): Section24Result {
  return calculateSection24Tax({
    grossRentalIncomeGbp: rentalIncome,
    allowableExpensesGbp: allowableExpenses,
    mortgageInterestGbp: mortgageInterest,
    otherTaxableIncomeGbp: employmentIncome,
    ownershipSharePct,
    taxYear,
  });
}
