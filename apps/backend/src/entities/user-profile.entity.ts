import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { numericTransformer } from "./numeric.transformer";

export const TAX_REGIONS = ["ENGLAND", "WALES", "SCOTLAND", "NORTHERN_IRELAND"] as const;
export type TaxRegion = (typeof TAX_REGIONS)[number];
export const STUDENT_LOAN_PLANS = ["PLAN_1", "PLAN_2", "PLAN_4", "PLAN_5", "POSTGRAD"] as const;
export type StudentLoanPlan = (typeof STUDENT_LOAN_PLANS)[number];
export const HOUSING_STATUSES = [
  "renting",
  "mortgage",
  "own_outright",
  "living_with_family",
] as const;
export type HousingStatus = (typeof HOUSING_STATUSES)[number];

@Entity("user_profiles")
export class UserProfile {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "user_id", unique: true })
  userId: string;

  @Column({ name: "display_name", type: "varchar", nullable: true })
  displayName: string | null;

  @Column({ name: "first_name", type: "varchar", nullable: true })
  firstName: string | null;

  @Column({ name: "last_name", type: "varchar", nullable: true })
  lastName: string | null;

  @Column({ name: "avatar_url", type: "text", nullable: true })
  avatarUrl: string | null;

  @Column({ default: "GBP" })
  currency: string;

  @Column({ default: "GB" })
  country: string;

  @Column({ name: "employment_type", type: "varchar", nullable: true })
  employmentType: "employed" | "self-employed" | "other" | null;

  @Column({
    name: "annual_salary",
    type: "decimal",
    precision: 12,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  annualSalary: number | null;

  @Column({
    name: "monthly_take_home",
    type: "decimal",
    precision: 12,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  monthlyTakeHome: number | null;

  @Column({ name: "has_second_income", default: false })
  hasSecondIncome: boolean;

  @Column({
    name: "second_income_monthly",
    type: "decimal",
    precision: 12,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  secondIncomeMonthly: number | null;

  @Column({ name: "has_rental_income", default: false })
  hasRentalIncome: boolean;

  @Column({
    name: "rental_income_monthly",
    type: "decimal",
    precision: 12,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  rentalIncomeMonthly: number | null;

  @Column({ name: "has_mortgage", default: false })
  hasMortgage: boolean;

  @Column({
    name: "mortgage_type",
    type: "varchar",
    default: "repayment",
  })
  mortgageType: "repayment" | "interest-only";

  @Column({
    name: "property_ownership_share",
    type: "decimal",
    precision: 5,
    scale: 2,
    default: 100.0,
    transformer: numericTransformer,
  })
  propertyOwnershipShare: number;

  @Column({ name: "has_buy_to_let", default: false })
  hasBuyToLet: boolean;

  @Column({ name: "buy_to_let_count", default: 1 })
  buyToLetCount: number;

  @Column({
    name: "buy_to_let_property_value",
    type: "decimal",
    precision: 12,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  buyToLetPropertyValue: number | null;

  @Column({
    name: "buy_to_let_monthly_rental",
    type: "decimal",
    precision: 12,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  buyToLetMonthlyRental: number | null;

  @Column({
    name: "buy_to_let_mortgage_balance",
    type: "decimal",
    precision: 12,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  buyToLetMortgageBalance: number | null;

  @Column({
    name: "buy_to_let_mortgage_rate",
    type: "decimal",
    precision: 5,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  buyToLetMortgageRate: number | null;

  @Column({
    name: "buy_to_let_mortgage_type",
    type: "varchar",
    default: "interest-only",
  })
  buyToLetMortgageType: "repayment" | "interest-only";

  @Column({
    name: "pension_percent",
    type: "decimal",
    precision: 5,
    scale: 2,
    default: 5.0,
    transformer: numericTransformer,
  })
  pensionPercent: number;

  @Column({
    name: "pension_employer_percent",
    type: "decimal",
    precision: 5,
    scale: 2,
    default: 3.0,
    transformer: numericTransformer,
  })
  pensionEmployerPercent: number;

  @Column({
    name: "is_salary_sacrifice",
    default: false,
  })
  isSalarySacrifice: boolean;

  @Column({
    name: "is_salary_sacrifice_employer_ni",
    default: false,
  })
  isSalarySacrificeEmployerNi: boolean;

  @Column({
    name: "monthly_savings_target",
    type: "decimal",
    precision: 12,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  monthlySavingsTarget: number | null;

  @Column({
    name: "savings_allocation_mode",
    type: "varchar",
    default: "per_account",
  })
  savingsAllocationMode: "total" | "per_account";

  @Column({
    name: "savings_default_interest_rate",
    type: "decimal",
    precision: 5,
    scale: 2,
    default: 5.0,
    transformer: numericTransformer,
  })
  savingsDefaultInterestRate: number;

  @Column({ name: "setup_checklist_completed_steps", type: "simple-array", default: "" })
  setupChecklistCompletedSteps: string[];

  @Column({ name: "custom_budget_categories", type: "simple-array", nullable: true })
  customBudgetCategories: string[] | null;

  @Column({ name: "enabled_pages", type: "simple-array", nullable: true })
  enabledPages: string[] | null;

  @Column({ name: "dashboard_widgets", type: "simple-array", nullable: true })
  dashboardWidgets: string[] | null;

  @Column({ name: "dashboard_widget_order", type: "simple-array", nullable: true })
  dashboardWidgetOrder: string[] | null;

  @Column({ name: "dashboard_widget_sizes", type: "simple-json", nullable: true })
  dashboardWidgetSizes: Record<string, "normal" | "wide"> | null;

  @Column({ name: "dashboard_widget_config", type: "simple-json", nullable: true })
  dashboardWidgetConfig: Record<string, any> | null;

  @Column({ name: "has_reset_financial_data", default: false })
  hasResetFinancialData: boolean;

  @Column({ name: "onboarding_completed", default: false })
  onboardingCompleted: boolean;

  // E23 D06/D07 profile facts. Nullable with no default: null means "not set" (section 3.4).
  /** One of TAX_REGIONS. England, Wales and NI share income-tax bands; Scotland does not. */
  @Column({ name: "tax_region", type: "varchar", nullable: true })
  taxRegion: TaxRegion | null;

  /** E23 D-3-B: birth year, not a date of birth or a stored age. */
  @Column({ name: "birth_year", type: "smallint", nullable: true })
  birthYear: number | null;

  /** Empty array = the user said "no student loan"; null = not answered. */
  @Column({ name: "student_loan_plans", type: "simple-array", nullable: true })
  studentLoanPlans: StudentLoanPlan[] | null;

  @Column({ name: "housing_status", type: "varchar", nullable: true })
  housingStatus: HousingStatus | null;

  @Column({
    name: "monthly_housing_cost",
    type: "decimal",
    precision: 12,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  monthlyHousingCost: number | null;

  @Column({
    name: "monthly_other_outgoings",
    type: "decimal",
    precision: 12,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  monthlyOtherOutgoings: number | null;

  /**
   * Last authenticated request, at day precision (BE-06, ruling D4: accounts inactive for 24 months
   * are due for erasure). Written by LastActiveInterceptor; new rows start at now().
   */
  @Index("IDX_user_profiles_last_active_at")
  @Column({ name: "last_active_at", type: "timestamptz", default: () => "now()" })
  lastActiveAt: Date;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
