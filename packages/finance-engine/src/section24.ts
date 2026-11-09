import type { Section24Input, Section24Result } from "./types.js";

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

  // Calculate tax on the rental portion
  // Band thresholds:
  // Personal allowance: 12570
  // Higher rate threshold: 50270
  // Additional rate threshold: 125140
  let taxOnTotal = 0;
  let taxOnOtherOnly = 0;

  const computeIncomeTax = (income: number): number => {
    if (income <= 12570) return 0;
    let tax = 0;
    const basicPortion = Math.min(income, 50270) - 12570;
    if (basicPortion > 0) tax += basicPortion * 0.2;

    if (income > 50270) {
      const higherPortion = Math.min(income, 125140) - 50270;
      if (higherPortion > 0) tax += higherPortion * 0.4;
    }

    if (income > 125140) {
      tax += (income - 125140) * 0.45;
    }
    return tax;
  };

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
  };
}
