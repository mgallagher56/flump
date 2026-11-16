import type {
  RetirementGrowthRates,
  RetirementHousingOverrideDto,
  RetirementTargetDto,
} from "@flump/api-contract";
import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { numericTransformer } from "./numeric.transformer";

@Entity("retirement_plans")
@Index("UQ_retirement_plans_user_id", ["userId"], { unique: true })
@Check(
  "CHK_retirement_plans_ages",
  `"retirement_age" IS NULL OR "plan_to_age" IS NULL OR "plan_to_age" > "retirement_age"`,
)
export class RetirementPlan {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "user_id" })
  userId: string;

  @Column({ name: "retirement_age", type: "integer", nullable: true })
  retirementAge: number | null;

  @Column({ name: "plan_to_age", type: "integer", nullable: true })
  planToAge: number | null;

  @Column({ name: "target", type: "jsonb", nullable: true })
  target: RetirementTargetDto | null;

  @Column({ name: "housing_override", type: "jsonb", nullable: true })
  housingOverride: RetirementHousingOverrideDto | null;

  @Column({ name: "state_pension_age", type: "integer", nullable: true })
  statePensionAge: number | null;

  @Column("decimal", {
    name: "state_pension_annual_forecast_gbp",
    precision: 12,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  statePensionAnnualForecastGbp: number | null;

  @Column({ name: "state_pension_qualifying_years", type: "integer", nullable: true })
  statePensionQualifyingYears: number | null;

  @Column({
    name: "growth_rates",
    type: "jsonb",
    default: () => `'{"lower":0.02,"middle":0.05,"higher":0.08}'::jsonb`,
  })
  growthRates: RetirementGrowthRates;

  @Column("decimal", {
    name: "inflation_rate",
    precision: 6,
    scale: 4,
    default: 0.02,
    transformer: numericTransformer,
  })
  inflationRate: number;

  @Column("decimal", {
    name: "cash_savings_nominal_rate",
    precision: 6,
    scale: 4,
    nullable: true,
    transformer: numericTransformer,
  })
  cashSavingsNominalRate: number | null;

  @Column("decimal", {
    name: "real_rent_growth_rate",
    precision: 6,
    scale: 4,
    default: 0,
    transformer: numericTransformer,
  })
  realRentGrowthRate: number;

  @Column({
    name: "excluded_account_ids",
    type: "jsonb",
    default: () => `'[]'::jsonb`,
  })
  excludedAccountIds: string[];

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
