import {
  calculateEmployerNISavings,
  getUkTaxYearRules,
  resolveUkTaxYear,
} from "@flump/finance-engine";

export const UK_QUALIFYING_LOWER = 6240;
export const UK_QUALIFYING_UPPER = 50270;
export const UK_ANNUAL_ALLOWANCE = 60000;
export const UK_LUMP_SUM_ALLOWANCE = 268275;
export const INFLATION_RATE = 2.5;
/** Drawdown rate behind the "estimated retirement income" figure. Shown next to the figure. */
export const SAFE_WITHDRAWAL_RATE = 0.04;

// PLSA UK Retirement Living Standards (single person, monthly).
export const PLSA_MINIMUM = 1200;
export const PLSA_MODERATE = 2608;
export const PLSA_COMFORTABLE = 3591;

/** Full new State Pension for the current tax year (sourced, per-year registry in finance-engine). */
export const currentStatePensionAnnual = (): number =>
  getUkTaxYearRules(resolveUkTaxYear()).statePension.fullNewAnnual;

export interface ForecastInput {
  startingPot: number;
  salary: number;
  employeePercent: number;
  employerPercent: number;
  isSalarySacrifice: boolean;
  passEmployerNi: boolean;
  /** Fixed monthly payments into current pots (saved). */
  directMonthlyContrib: number;
  /** Scenario lever: an extra personal payment each month on top of everything saved. */
  extraMonthly: number;
  /** Nominal annual growth, as a percentage figure (5 means 5%). */
  growthRate: number;
  horizonYears: number;
  useQualifyingEarnings: boolean;
  adjustForInflation: boolean;
  includeStatePension: boolean;
}

export interface ForecastPoint {
  year: string;
  totalPot: number;
  totalContribs: number;
  growth: number;
}

export type PlsaTier = "comfortable" | "moderate" | "minimum" | "below";

export interface ForecastResult {
  pensionableSalary: number;
  monthlyEmployee: number;
  monthlyEmployer: number;
  monthlyExtra: number;
  totalMonthly: number;
  totalAnnualInflow: number;
  effectiveAnnualRate: number;
  chartData: ForecastPoint[];
  finalBalance: number;
  totalEmployeeContribs: number;
  totalEmployerContribs: number;
  totalGrowth: number;
  taxFreeLumpSum: number;
  drawdownPotAfterLumpSum: number;
  annualRetirementIncome: number;
  monthlyRetirementIncome: number;
  plsaTier: PlsaTier;
  plsaProgressPct: number;
  statePensionAnnual: number;
}

export const plsaTierFor = (monthlyIncome: number): PlsaTier => {
  if (monthlyIncome >= PLSA_COMFORTABLE) return "comfortable";
  if (monthlyIncome >= PLSA_MODERATE) return "moderate";
  if (monthlyIncome >= PLSA_MINIMUM) return "minimum";
  return "below";
};

/** Compound projection. Pure: the same inputs always give the same figures. */
export const projectPension = (input: ForecastInput): ForecastResult => {
  const {
    startingPot,
    salary,
    employeePercent,
    employerPercent,
    isSalarySacrifice,
    passEmployerNi,
    directMonthlyContrib,
    extraMonthly,
    growthRate,
    horizonYears,
    useQualifyingEarnings,
    adjustForInflation,
    includeStatePension,
  } = input;

  // Pensionable salary: total gross, or UK qualifying earnings (£6,240 to £50,270).
  const pensionableSalary = !useQualifyingEarnings
    ? salary
    : salary <= UK_QUALIFYING_LOWER
      ? 0
      : Math.min(salary, UK_QUALIFYING_UPPER) - UK_QUALIFYING_LOWER;

  const monthlyEmployee = (pensionableSalary * (employeePercent / 100)) / 12;
  const annualEmployerNiSavings =
    isSalarySacrifice && passEmployerNi
      ? calculateEmployerNISavings(salary, pensionableSalary * (employeePercent / 100))
      : 0;
  const monthlyEmployerNi = annualEmployerNiSavings / 12;
  const monthlyEmployer = (pensionableSalary * (employerPercent / 100)) / 12 + monthlyEmployerNi;
  const monthlyExtra = extraMonthly;
  const totalMonthly = monthlyEmployee + monthlyEmployer + directMonthlyContrib + monthlyExtra;
  const totalAnnualInflow = totalMonthly * 12;

  const effectiveAnnualRate = adjustForInflation
    ? Math.max(0, growthRate - INFLATION_RATE)
    : growthRate;
  const monthlyRate = effectiveAnnualRate / 100 / 12;
  const totalMonths = horizonYears * 12;

  let balance = startingPot;
  let cumEmployee = 0;
  let cumEmployer = 0;
  let cumDirect = 0;
  const chartData: ForecastPoint[] = [
    {
      year: "Year 0",
      totalPot: Math.round(startingPot),
      totalContribs: Math.round(startingPot),
      growth: 0,
    },
  ];

  for (let m = 1; m <= totalMonths; m++) {
    balance = balance * (1 + monthlyRate) + totalMonthly;
    cumEmployee += monthlyEmployee;
    cumEmployer += monthlyEmployer;
    cumDirect += directMonthlyContrib + monthlyExtra;

    if (m % 12 === 0) {
      const paid = cumEmployee + cumEmployer + cumDirect;
      const principal = startingPot + paid;
      chartData.push({
        year: `Year ${m / 12}`,
        totalPot: Math.round(balance),
        totalContribs: Math.round(principal),
        growth: Math.round(Math.max(0, balance - principal)),
      });
    }
  }

  const finalBalance = Math.round(balance);
  const paidTotal = Math.round(cumEmployee + cumEmployer + cumDirect);
  const totalGrowth = Math.max(0, finalBalance - startingPot - paidTotal);

  const statePensionAnnual = currentStatePensionAnnual();
  const taxFreeLumpSum = Math.min(Math.round(finalBalance * 0.25), UK_LUMP_SUM_ALLOWANCE);
  const drawdownPotAfterLumpSum = Math.max(0, finalBalance - taxFreeLumpSum);
  const annualRetirementIncome =
    Math.round(finalBalance * SAFE_WITHDRAWAL_RATE) +
    (includeStatePension ? statePensionAnnual : 0);
  const monthlyRetirementIncome = Math.round(annualRetirementIncome / 12);

  return {
    pensionableSalary,
    monthlyEmployee,
    monthlyEmployer,
    monthlyExtra,
    totalMonthly,
    totalAnnualInflow,
    effectiveAnnualRate,
    chartData,
    finalBalance,
    totalEmployeeContribs: Math.round(cumEmployee + cumDirect),
    totalEmployerContribs: Math.round(cumEmployer),
    totalGrowth,
    taxFreeLumpSum,
    drawdownPotAfterLumpSum,
    annualRetirementIncome,
    monthlyRetirementIncome,
    plsaTier: plsaTierFor(monthlyRetirementIncome),
    plsaProgressPct: Math.min(100, (monthlyRetirementIncome / PLSA_COMFORTABLE) * 100),
    statePensionAnnual,
  };
};
