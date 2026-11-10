export type FinancialStage =
  | "STAGE_1_DEBT_RECOVERY"
  | "STAGE_2_BUFFER_BUILD"
  | "STAGE_3_WEALTH_OPTIMIZE";

export type ActiveModule =
  | "accounts"
  | "debt"
  | "budget"
  | "pension"
  | "mortgage"
  | "forecast"
  | "tax";

export type UkTaxYear = "2025/26" | "2026/27";

export type UkTaxRegion = "ENGLAND_NI_WALES" | "SCOTLAND";

export type UkEmploymentStatus = "PAYE" | "SELF_EMPLOYED" | "MIXED" | "OTHER";

export type UkStudentLoanPlan = "NONE" | "PLAN_1" | "PLAN_2" | "PLAN_4" | "PLAN_5" | "POSTGRAD";

export type HousingStatus = "RENTING" | "MORTGAGE" | "OWN_OUTRIGHT";

export interface FinancialBaseline {
  userId: string;
  age?: number;
  taxYear: UkTaxYear;
  ukRegion: UkTaxRegion;
  employmentStatus: UkEmploymentStatus;
  annualGrossSalary: number;
  monthlyTakeHomeOverride?: number;
  annualBonusOrSideIncome: number;
  housingStatus?: HousingStatus;
  monthlyHousingCost?: number;
  propertyValue?: number;
  mortgageBalance?: number;
  monthlyOtherOutgoings?: number;
  totalCashSavings?: number;
  totalPensionPot?: number;
  totalUnsecuredDebt?: number;
  pensionContributionPct: number;
  employerPensionMatchPct: number;
  isSalarySacrifice: boolean;
  studentLoanPlan: UkStudentLoanPlan;
  propertyOwnershipSharePct: number; // e.g., 50 or 100 for BTL splitting
  financialStage: FinancialStage;
  enabledModules: ActiveModule[];
}

export interface OnboardingSeedPayload {
  mode?: "DEBT" | "WEALTH";
  age?: number;
  annualIncome?: number;
  annualGrossSalary?: number;
  monthlyTakeHomeOverride?: number;
  pensionContributionPct?: number;
  isSalarySacrifice?: boolean;
  salarySacrifice?: boolean;
  housingStatus?: HousingStatus;
  monthlyHousingCost?: number;
  propertyValue?: number;
  mortgageBalance?: number;
  monthlyOtherOutgoings?: number;
  totalCashSavings?: number;
  totalPensionPot?: number;
  totalUnsecuredDebt?: number;
  averageDebtApr?: number;
  monthlyDebtRepaymentBudget?: number;
  initialCashSavings?: number;
  initialInvestments?: number;
  monthlyContribution?: number;
  monthlySavingsSurplus?: number;
  studentLoanPlan?: UkStudentLoanPlan;
  isSelfEmployed?: boolean;
  inferredStage?: FinancialStage;
  inferredModules: Array<ActiveModule | "savings">;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Debt Engine Types
// ---------------------------------------------------------------------------

export type DebtType =
  | "credit_card"
  | "overdraft"
  | "loan"
  | "loan_personal"
  | "car_finance"
  | "bnpl"
  | "student_loan"
  | "other";

export interface DebtItem {
  id: string;
  name: string;
  balanceGbp?: number;
  interestRateApr?: number;
  minimumPaymentGbp?: number;
  debtType?: DebtType;
  promoAprExpiryDate?: string; // ISO date 'YYYY-MM-DD'
  revertApr?: number;
  creditLimitGbp?: number;
  // Compatibility aliases for @repo/common and existing UI callers
  balance?: number;
  apr?: number;
  minimumPayment?: number;
  type?: DebtType;
  promotionalExpiryMonths?: number;
  balloonPayment?: { amount: number; dueMonths: number };
  studentLoanPlan?: "plan1" | "plan2" | "plan4" | "plan5" | "postgrad" | UkStudentLoanPlan;
}

export interface NormalizedDebtItem extends DebtItem {
  balanceGbp: number;
  interestRateApr: number;
  minimumPaymentGbp: number;
  balance: number;
  apr: number;
  minimumPayment: number;
}

export type DebtPayoffStrategy = "AVALANCHE" | "SNOWBALL";

export interface PayoffScheduleMonth {
  month: number;
  debtBalances: Record<string, number>;
  totalBalance: number;
  totalInterestPaidThisMonth: number;
  cumulativeInterest: number;
  paymentsMade: Record<string, number>;
}

export interface PayoffResult {
  months: number;
  debtFreeDate: string;
  totalInterest: number;
  totalPaid: number;
  quickWinDebtName?: string;
  quickWinMonths?: number;
  monthlySchedule: PayoffScheduleMonth[];
}

export interface AvalancheVsSnowballComparison {
  avalanche: PayoffResult;
  snowball: PayoffResult;
  minimumOnly: PayoffResult;
  interestSavedAvalancheVsMin: number;
  monthsShavedAvalancheVsMin: number;
  interestSavedAvalancheVsSnowball: number;
  snowballFirstWinDescription: string;
}

export interface ZeroPercentCliffResult {
  requiredMonthlyPayment: number;
  balanceRemainingIfMinimum: number;
  penaltyInterestFirstYearIfUnpaid: number;
  daysRemaining: number;
  alertRequired: boolean;
}

export interface OverdraftCostResult {
  annualPoundCost: number;
  monthlyPoundCost: number;
  effectiveApr: number;
}

export interface CarFinanceBalloonResult {
  balloonAmount: number;
  dueMonths: number;
  monthlySinkingFundNeeded: number;
  totalCostOfFinance: number;
}

export interface StudentLoanEvaluationResult {
  plan: "plan1" | "plan2" | "plan4" | "plan5" | "postgrad";
  annualRepayment: number;
  monthlyRepayment: number;
  threshold: number;
  rate: number;
  writeOffYears: number;
  willLikelyRepayBeforeWriteOff: boolean;
  recommendation: "do_not_overpay" | "consider_overpaying";
  reasoning: string;
}

export interface DebtToWealthBridgePoint {
  month: number;
  yearNumber: number;
  debtRemaining: number;
  wealthAccumulated: number;
  isPostDebtFree: boolean;
}

export interface SafeToSpendResult {
  weeklyAllowance: number;
  dailyAllowance: number;
  monthlyDiscretionary: number;
  fixedCommitments: number;
}

export type FinancialLifecycleStage = "stabilize" | "buffer" | "optimize";

export interface FinancialStageEvaluation {
  stage: FinancialLifecycleStage;
  canonicalStage: FinancialStage;
  totalUnsecuredDebt: number;
  highInterestDebt: number;
  monthlySurplus: number;
  emergencyRunwayMonths: number;
  starterBufferMet: boolean;
  primaryHeroMetric: "unsecured_debt" | "emergency_runway" | "net_worth";
  headline: string;
  subline: string;
}

export interface DebtScheduleMonthPayment {
  debtId: string;
  debtName: string;
  startingBalanceGbp: number;
  interestChargedGbp: number;
  principalPaidGbp: number;
  endingBalanceGbp: number;
  isPaidOff: boolean;
}

export interface DebtScheduleMonth {
  monthIndex: number; // 1-indexed
  calendarDate: string; // 'YYYY-MM'
  totalPaymentsGbp: number;
  totalInterestGbp: number;
  totalPrincipalGbp: number;
  remainingDebtGbp: number;
  payments: DebtScheduleMonthPayment[];
}

export interface PromoCliffAlert {
  debtId: string;
  debtName: string;
  promoExpiryDate: string;
  projectedPayoffDate: string;
  projectedBalanceAtExpiryGbp: number;
  revertApr: number;
  requiredMonthlyToClearBeforeCliff: number;
  hasCliffRisk: boolean;
}

export interface CrossoverMonth {
  monthIndex: number; // 1 to 60 post-debt payoff
  calendarDate: string;
  monthlyContributionGbp: number;
  totalContributedGbp: number;
  projectedWealthGbp: number;
  interestEarnedGbp: number;
}

export interface DebtPayoffResult {
  strategy: DebtPayoffStrategy;
  totalStartingDebtGbp: number;
  totalInterestPaidGbp: number;
  monthsToPayoff: number;
  debtFreeDate: string; // 'Month YYYY'
  firstQuickWinDate?: string; // 'Month YYYY'
  firstQuickWinDebtName?: string;
  firstQuickWinMonth?: number;
  interestSavedVsMinimumGbp: number;
  promoCliffAlerts: PromoCliffAlert[];
  schedule: DebtScheduleMonth[];
  crossoverProjection: CrossoverMonth[];
  fiveYearPostDebtWealthGbp: number;
}

// ---------------------------------------------------------------------------
// UK Tax & Allowances Types
// ---------------------------------------------------------------------------

export interface UkTaxCalculationInput {
  grossSalary: number;
  bonusOrSideIncome?: number;
  taxableSavingsInterestGbp?: number;
  netBtlProfitGbp?: number;
  pensionContributionPct?: number;
  isSalarySacrifice?: boolean;
  employerPensionMatchPct?: number;
  studentLoanPlan?: UkStudentLoanPlan;
  taxYear?: UkTaxYear;
  region?: UkTaxRegion;
}

export interface TaxTrapAnalysis {
  isInTaxTrap: boolean;
  isNearTaxTrap: boolean;
  grossIncome: number;
  adjustedNetIncome: number;
  personalAllowanceTaperGbp: number;
  effectivePersonalAllowanceGbp: number;
  excessOver100kGbp: number;
  excessAbove100k: number;
  marginalRatePct: number;
  effectiveMarginalRatePct: number;
  contributionRequiredToEscapeGbp: number;
  recommendedSacrifice: number;
  estimatedTaxSavedByEscapingGbp: number;
  estimatedTaxSaved: number;
  lostPersonalAllowance: number;
}

export interface UkAllowancesStatus {
  isaAllowanceGbp: number;
  isaAllowanceUsedGbp: number;
  isaAllowanceRemainingGbp: number;
  pensionAnnualAllowanceGbp: number;
  pensionAllowanceUsedGbp: number;
  pensionAllowanceRemainingGbp: number;
  personalSavingsAllowanceGbp: number;
  marginalIncomeTaxBand: "PERSONAL_ALLOWANCE" | "BASIC" | "HIGHER" | "ADDITIONAL";
  taxYearEndDate: string; // '5 April YYYY'
  daysRemainingInTaxYear: number;
}

export interface UkTaxCalculationResult {
  taxYear: UkTaxYear;
  grossIncomeGbp: number;
  adjustedNetIncomeGbp: number;
  taxableIncomeGbp: number;
  incomeTaxGbp: number;
  nationalInsuranceGbp: number;
  studentLoanDeductionGbp: number;
  employeePensionDeductionGbp: number;
  employerPensionContributionGbp: number;
  totalDeductionsGbp: number;
  netTakeHomePayAnnualGbp: number;
  netTakeHomePayMonthlyGbp: number;
  effectiveTaxRatePct: number;
  taxTrap: TaxTrapAnalysis;
  allowances: UkAllowancesStatus;
}

// ---------------------------------------------------------------------------
// Mortgage & Section 24 Types
// ---------------------------------------------------------------------------

export interface MortgageCalculationInput {
  propertyValueGbp: number;
  currentBalanceGbp: number;
  interestRateApr: number;
  remainingTermMonths: number;
  monthlyOverpaymentGbp?: number;
  mortgageFixExpiryDate?: string; // 'YYYY-MM-DD'
  afterTaxIsaExpectedReturnApr?: number; // e.g. 6.0
}

export interface LtvMilestone {
  targetLtvPct: number; // 85, 80, 75, 60
  targetBalanceGbp: number;
  lumpSumNeededGbp: number;
  requiredMonthlyOverpaymentBeforeFixGbp?: number;
  isAchieved: boolean;
}

export interface MortgageVsIsaResult {
  standardPayment: number;
  interestSaved: number;
  monthsShaved: number;
  yearsShaved: string;
  totalStandardInterest: number;
  totalInterestOverpay: number;
  isaAccumulatedValue: number;
  totalIsaContributed: number;
  isaGrowth: number;
  netWealthDelta: number;
}

export interface CompoundTrajectoryPoint {
  year: number;
  contributions: number;
  interest: number;
  total: number;
}

export interface CompoundTrajectoryResult {
  endBalance: number;
  totalContributions: number;
  totalInterest: number;
  points: CompoundTrajectoryPoint[];
}

export interface MortgageAmortizationResult {
  monthlyPaymentGbp: number;
  totalInterestStandardGbp: number;
  totalInterestWithOverpaymentGbp: number;
  interestSavedGbp: number;
  monthsSaved: number;
  newTermMonths: number;
  payoffDate: string;
  currentLtvPct: number;
  targetLtvMilestones: LtvMilestone[];
  overpayVsIsaComparison: {
    overpaymentTotalGbp: number;
    guaranteedMortgageInterestSavedGbp: number;
    projectedIsaWealthGbp: number;
    netBenefitOfIsaOverMortgageGbp: number;
  };
}

export interface Section24Input {
  grossRentalIncomeGbp: number;
  allowableExpensesGbp: number; // Maintenance, letting fees, etc. (excluding mortgage interest)
  mortgageInterestGbp: number;
  otherTaxableIncomeGbp: number; // PAYE salary, self-employment, etc.
  ownershipSharePct?: number; // default 100
  taxYear?: UkTaxYear;
}

export interface Section24Result {
  ownershipSharePct: number;
  shareRentalIncomeGbp: number;
  shareAllowableExpensesGbp: number;
  shareMortgageInterestGbp: number;
  netRentalProfitBeforeFinanceCostsGbp: number;
  taxableRentalProfitGbp: number;
  section24TaxCreditGbp: number; // 20% basic rate reducer
  netRentalTaxLiabilityGbp: number;
  effectiveRentalTaxRatePct: number;
  balancingPayment31JanGbp: number;
  firstPaymentOnAccount31JanGbp: number;
  totalDue31JanGbp: number;
  secondPaymentOnAccount31JulyGbp: number;
  totalDue31JulyGbp: number;
  recommendedMonthlyTaxSetAsideGbp: number;
  // Compatibility aliases
  actualCashProfit: number;
  section24TaxableProfit: number;
  grossTaxOnProperty: number;
  financeCredit: number;
  finalTaxDue: number;
  oldRulesTax: number;
  section24Penalty: number;
  effectiveTaxRate: number;
  netRentalIncomeAfterTax: number;
  isHigherRate: boolean;
}

// ---------------------------------------------------------------------------
// Forecast & Life Events Types
// ---------------------------------------------------------------------------

export type LifeEventType =
  | "BUY_HOME"
  | "HAVE_CHILD"
  | "REMORTGAGE_RATE_SHOCK"
  | "RETIRE_EARLY_BRIDGE";

export interface LifeEventScenario {
  id: string;
  type: LifeEventType;
  title: string;
  startYear: number; // e.g. 3 (years from now)
  durationYears?: number; // e.g. 5
  lumpSumCostGbp?: number; // e.g. deposit £40k
  ongoingMonthlyDeltaGbp: number; // e.g. +£800/mo child care or +£350 remortgage
}

export interface ForecastYearPoint {
  year: number;
  age: number;
  baselineNetWorthGbp: number;
  scenarioNetWorthGbp: number;
  isaBalanceGbp: number;
  pensionBalanceGbp: number;
  cashBalanceGbp: number;
  debtBalanceGbp: number;
  propertyEquityGbp: number;
}

export interface ForecastResult {
  startingNetWorthGbp: number;
  trajectory: ForecastYearPoint[];
  tenYearNetWorthBaselineGbp: number;
  tenYearNetWorthScenarioGbp: number;
  thirtyYearNetWorthBaselineGbp: number;
  thirtyYearNetWorthScenarioGbp: number;
}

// ---------------------------------------------------------------------------
// Financial Health Score Types
// ---------------------------------------------------------------------------

export interface HealthScoreComponent {
  name: string;
  score: number; // 0 - 100
  weight: number; // 0 - 1
  comment: string;
}

export interface HealthScoreResult {
  overallScore: number; // 0 - 100
  stage: FinancialStage;
  grade: "CRITICAL" | "NEEDS_ATTENTION" | "GOOD" | "EXCELLENT";
  components: HealthScoreComponent[];
  topRecommendations: string[];
}

// ---------------------------------------------------------------------------
// Core User & Financial Account Entity Types
// ---------------------------------------------------------------------------

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

export interface Account {
  id: string;
  userId: string;
  name: string;
  type: "checking" | "savings" | "credit_card" | "investment" | "other";
  balance: number;
  currency: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  accountId: string;
  userId: string;
  amount: number; // positive = credit/income, negative = debit/spend
  description: string;
  category: string;
  timestamp: string;
}

export interface ApiError {
  message: string;
  statusCode: number;
}
