import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { numericTransformer } from "./numeric.transformer";

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
    default: true,
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

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
