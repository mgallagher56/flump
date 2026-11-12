import { z } from "zod";
import { Money, Percent } from "../primitives.js";

const AvatarUrl = z
  .string()
  .max(262144 + 64)
  .refine(
    (v) =>
      /^https:\/\//.test(v) ? v.length <= 2048 : /^data:image\/(png|jpeg|webp);base64,/.test(v),
    "must be an https URL or a png, jpeg or webp data URL",
  );

const ShortText = z.string().trim().max(120);
const PageKeyList = z.array(z.string().min(1).max(64)).max(20);

/**
 * PATCH /user-profile: every field `UserProfileService.updateProfile` reads. Fields the web sends
 * that the backend ignores (age, housingStatus, ...) are deliberately absent: shadow mode reports
 * them as unknown keys. Both `null` and absent are accepted on nullable columns.
 */
export const UpdateProfileRequest = z.object({
  displayName: ShortText.nullish(),
  firstName: ShortText.nullish(),
  lastName: ShortText.nullish(),
  avatarUrl: AvatarUrl.nullish(),
  currency: z.string().length(3).optional(),
  country: z.string().min(2).max(2).optional(),
  employmentType: z.enum(["employed", "self-employed", "other"]).nullish(),
  annualSalary: Money.nullish(),
  monthlyTakeHome: Money.nullish(),
  hasSecondIncome: z.boolean().optional(),
  secondIncomeMonthly: Money.nullish(),
  hasRentalIncome: z.boolean().optional(),
  rentalIncomeMonthly: Money.nullish(),
  hasMortgage: z.boolean().optional(),
  mortgageType: z.enum(["repayment", "interest-only"]).optional(),
  propertyOwnershipShare: Percent.optional(),
  hasBuyToLet: z.boolean().optional(),
  buyToLetCount: z.number().int().min(0).max(1000).optional(),
  buyToLetPropertyValue: Money.nullish(),
  buyToLetMonthlyRental: Money.nullish(),
  buyToLetMortgageBalance: Money.nullish(),
  buyToLetMortgageRate: Percent.nullish(),
  buyToLetMortgageType: z.enum(["repayment", "interest-only"]).optional(),
  pensionPercent: Percent.optional(),
  pensionEmployerPercent: Percent.optional(),
  isSalarySacrifice: z.boolean().optional(),
  isSalarySacrificeEmployerNi: z.boolean().optional(),
  monthlySavingsTarget: Money.nullish(),
  savingsAllocationMode: z.enum(["total", "per_account"]).optional(),
  savingsDefaultInterestRate: Percent.optional(),
  enabledPages: PageKeyList.optional(),
  dashboardWidgets: PageKeyList.optional(),
  dashboardWidgetOrder: PageKeyList.optional(),
  dashboardWidgetSizes: z.record(z.string(), z.enum(["normal", "wide"])).optional(),
  dashboardWidgetConfig: z.record(z.string(), z.unknown()).optional(),
  customBudgetCategories: z.array(z.string().min(1).max(64)).max(50).optional(),
  onboardingCompleted: z.boolean().optional(),
});

export const UpdateChecklistRequest = z.object({
  step: z.string().min(1).max(64),
  completed: z.boolean(),
});
