import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("user_profiles")
export class UserProfile {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "user_id", unique: true })
  userId: string;

  @Column({ name: "display_name", type: "varchar", nullable: true })
  displayName: string | null;

  @Column({ default: "GBP" })
  currency: string;

  @Column({ default: "GB" })
  country: string;

  @Column({ name: "employment_type", type: "varchar", nullable: true })
  employmentType: "employed" | "self-employed" | "other" | null;

  @Column({ name: "annual_salary", type: "decimal", precision: 12, scale: 2, nullable: true })
  annualSalary: number | null;

  @Column({ name: "monthly_take_home", type: "decimal", precision: 12, scale: 2, nullable: true })
  monthlyTakeHome: number | null;

  @Column({ name: "has_second_income", default: false })
  hasSecondIncome: boolean;

  @Column({
    name: "second_income_monthly",
    type: "decimal",
    precision: 12,
    scale: 2,
    nullable: true,
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
  })
  rentalIncomeMonthly: number | null;

  @Column({ name: "has_mortgage", default: false })
  hasMortgage: boolean;

  @Column({
    name: "property_ownership_share",
    type: "decimal",
    precision: 5,
    scale: 2,
    default: 100.0,
  })
  propertyOwnershipShare: number;

  @Column({
    name: "pension_percent",
    type: "decimal",
    precision: 5,
    scale: 2,
    default: 5.0,
  })
  pensionPercent: number;

  @Column({
    name: "is_salary_sacrifice",
    default: true,
  })
  isSalarySacrifice: boolean;

  @Column({ name: "setup_checklist_completed_steps", type: "simple-array", default: "" })
  setupChecklistCompletedSteps: string[];

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
