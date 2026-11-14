import type { Section24Input, Section24Result } from "./types.js";
import {
  calculateIncomeTaxOnTaxable,
  calculatePersonalAllowanceForYear,
  getUkTaxYearRules,
  resolveUkTaxYear,
} from "./uk-tax-year.js";

/**
 * Calculates Section 24 Buy-to-Let Landlord Tax and HMRC Payments on Account Reserve.
 */
export function calculateSection24Tax(input: Section24Input): Section24Result {
  const share = Math.min(100, Math.max(1, input.ownershipSharePct ?? 100)) / 100;
  const shareRentalIncome = Math.round(Math.max(0, input.grossRentalIncomeGbp) * share * 100) / 100;
  const shareAllowableExpenses =
    Math.round(Math.max(0, input.allowableExpensesGbp) * share * 100) / 100;
  const shareMortgageInterest =
    Math.round(Math.max(0, input.mortgageInterestGbp) * share * 100) / 100;

  // True net profit before tax
  const netRentalProfitBeforeFinance = shareRentalIncome - shareAllowableExpenses;

  // Under Section 24: mortgage interest cannot be deducted to find taxable profit
  const taxableRentalProfit = Math.max(0, netRentalProfitBeforeFinance);

  // Determine marginal tax band of landlord from other taxable income
  const otherIncome = Math.max(0, input.otherTaxableIncomeGbp);
  const totalCombinedIncome = otherIncome + taxableRentalProfit;

  // Tax on the rental slice = tax on (other + rental) minus tax on other alone, using the
  // tax year's rUK bands and the Personal Allowance taper (above £100,000 the allowance falls by
  // £1 for every £2, so the slice can be taxed at an effective 60%).
  const rules = getUkTaxYearRules(resolveUkTaxYear(input.taxYear));
  const computeIncomeTax = (income: number): number => {
    const allowance = calculatePersonalAllowanceForYear(income, rules);
    return calculateIncomeTaxOnTaxable(Math.max(0, income - allowance), rules, "ENGLAND_NI_WALES")
      .total;
  };

  let taxOnTotal = 0;
  let taxOnOtherOnly = 0;

  taxOnTotal = computeIncomeTax(totalCombinedIncome);
  taxOnOtherOnly = computeIncomeTax(otherIncome);

  const grossRentalTaxLiability = Math.max(0, taxOnTotal - taxOnOtherOnly);

  // Section 24 20% basic rate finance cost tax credit
  const eligibleFinanceCost = Math.min(shareMortgageInterest, taxableRentalProfit);
  const section24TaxCredit = Math.round(eligibleFinanceCost * 0.2 * 100) / 100;

  // Net tax payable on rental income after Section 24 credit
  const netRentalTaxLiability = Math.max(
    0,
    Math.round((grossRentalTaxLiability - section24TaxCredit) * 100) / 100,
  );

  const effectiveRentalTaxRate =
    taxableRentalProfit > 0
      ? Math.round((netRentalTaxLiability / taxableRentalProfit) * 1000) / 10
      : 0;

  // HMRC Payments on Account calculation:
  // If liability > £1,000:
  // 31 Jan: Balancing payment for current year + 1st payment on account (50% of annual liability)
  // 31 Jul: 2nd payment on account (50% of annual liability)
  const isSubjectToPoA = netRentalTaxLiability >= 1000;
  const paymentOnAccount = isSubjectToPoA ? Math.round(netRentalTaxLiability * 0.5 * 100) / 100 : 0;

  const balancingPayment31Jan = netRentalTaxLiability;
  const firstPaymentOnAccount31Jan = paymentOnAccount;
  const totalDue31Jan =
    Math.round((balancingPayment31Jan + firstPaymentOnAccount31Jan) * 100) / 100;

  const secondPaymentOnAccount31July = paymentOnAccount;
  const totalDue31July = secondPaymentOnAccount31July;

  // Recommended monthly tax set aside:
  // Monthly reserve needed to cover annual recurring tax bills smoothly
  const recommendedMonthlyTaxSetAside = Math.round((netRentalTaxLiability / 12) * 100) / 100;

  // Old rules (pre-Section 24) comparison
  const actualCashProfit = Math.max(0, netRentalProfitBeforeFinance - shareMortgageInterest);
  const isHigherRate = otherIncome >= 50270;
  // Pre-Section 24: interest was deducted, so the cash profit is the taxable slice. Same slice
  // method and allowance taper as above, so the "penalty" is only the effect of Section 24.
  const oldRulesTax =
    Math.round(
      (computeIncomeTax(otherIncome + actualCashProfit) - computeIncomeTax(otherIncome)) * 100,
    ) / 100;
  const section24Penalty = Math.max(
    0,
    Math.round((netRentalTaxLiability - oldRulesTax) * 100) / 100,
  );
  const netRentalIncomeAfterTax = Math.max(
    0,
    Math.round((actualCashProfit - netRentalTaxLiability) * 100) / 100,
  );

  return {
    ownershipSharePct: Math.round(share * 100),
    shareRentalIncomeGbp: shareRentalIncome,
    shareAllowableExpensesGbp: shareAllowableExpenses,
    shareMortgageInterestGbp: shareMortgageInterest,
    netRentalProfitBeforeFinanceCostsGbp: Math.round(netRentalProfitBeforeFinance * 100) / 100,
    taxableRentalProfitGbp: Math.round(taxableRentalProfit * 100) / 100,
    section24TaxCreditGbp: section24TaxCredit,
    netRentalTaxLiabilityGbp: netRentalTaxLiability,
    effectiveRentalTaxRatePct: effectiveRentalTaxRate,
    balancingPayment31JanGbp: balancingPayment31Jan,
    firstPaymentOnAccount31JanGbp: firstPaymentOnAccount31Jan,
    totalDue31JanGbp: totalDue31Jan,
    secondPaymentOnAccount31JulyGbp: secondPaymentOnAccount31July,
    totalDue31JulyGbp: totalDue31July,
    recommendedMonthlyTaxSetAsideGbp: recommendedMonthlyTaxSetAside,
    // Compatibility aliases
    actualCashProfit: Math.round(actualCashProfit * 100) / 100,
    section24TaxableProfit: Math.round(taxableRentalProfit * 100) / 100,
    grossTaxOnProperty: Math.round(grossRentalTaxLiability * 100) / 100,
    financeCredit: section24TaxCredit,
    finalTaxDue: netRentalTaxLiability,
    oldRulesTax,
    section24Penalty,
    effectiveTaxRate: effectiveRentalTaxRate,
    netRentalIncomeAfterTax,
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
): Section24Result {
  return calculateSection24Tax({
    grossRentalIncomeGbp: rentalIncome,
    allowableExpensesGbp: allowableExpenses,
    mortgageInterestGbp: mortgageInterest,
    otherTaxableIncomeGbp: employmentIncome,
    ownershipSharePct,
  });
}
