import {
  calculateEmployerNISavings,
  calculateUKEWNITakeHome,
  getUkTaxYearContext,
  type UK_STUDENT_LOANS,
} from "@flump/finance-engine";

/**
 * calculateUKTax: wrapper that delegates to the canonical taxRules.ts helper.
 *
 * Accepts an optional taxYear (defaults to the current UK tax year).
 * Maintains the existing return shape for backwards compatibility with
 * callers that expect { pension, incomeTax, ni, studentLoan, netPay, ... }.
 */
export const calculateUKTax = (
  gross: number,
  pensionPercent: number,
  studentLoanPlan: string,
  taxYear?: string,
  isSalarySacrifice: boolean = true,
  isEmployerNi: boolean = false,
) => {
  const year = taxYear ?? getUkTaxYearContext().ratesYear;
  const planKey =
    studentLoanPlan !== "none"
      ? (studentLoanPlan as keyof (typeof UK_STUDENT_LOANS)[string]["plans"])
      : "none";

  const result = calculateUKEWNITakeHome(
    gross,
    "employed", // this calculator is for employed/PAYE context
    pensionPercent,
    isSalarySacrifice,
    year,
    planKey,
  );

  const employerNiSaving =
    isSalarySacrifice && isEmployerNi ? calculateEmployerNISavings(gross, result.pension, year) : 0;

  return {
    pension: result.pension,
    employerNiSaving,
    totalPension: result.pension + employerNiSaving,
    incomeTax: result.incomeTax,
    ni: result.ni,
    studentLoan: result.studentLoan,
    netPay: result.netAnnual,
    gross: result.gross,
    adjustedGross: Math.max(0, gross - result.pension),
    personalAllowance: result.personalAllowance,
  };
};

export type TakeHomeResult = ReturnType<typeof calculateUKTax>;
