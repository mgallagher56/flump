import { z } from "zod";
import { IsoDateTime, Money, ResponseMoney, Uuid } from "../primitives.js";

export const RetirementGrowthRatesSchema = z.strictObject({
  lower: z.number().finite().min(0).max(1),
  middle: z.number().finite().min(0).max(1),
  higher: z.number().finite().min(0).max(1),
});
export type RetirementGrowthRates = z.infer<typeof RetirementGrowthRatesSchema>;

export const RetirementBudgetLineStatusSchema = z.union([
  z.literal("continues"),
  z.literal("stops"),
  z.strictObject({
    kind: z.literal("changes"),
    monthlyAmount: Money,
  }),
]);
export type RetirementBudgetLineStatusDto = z.infer<typeof RetirementBudgetLineStatusSchema>;

export const RetirementBudgetLineSettingSchema = z.strictObject({
  budgetEntryId: Uuid,
  status: RetirementBudgetLineStatusSchema,
});
export type RetirementBudgetLineSettingDto = z.infer<typeof RetirementBudgetLineSettingSchema>;

export const RetirementTargetSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("typed"),
    yearlyAmount: Money,
  }),
  z.strictObject({
    kind: z.literal("budget"),
    lineSettings: z.array(RetirementBudgetLineSettingSchema).max(200),
  }),
]);
export type RetirementTargetDto = z.infer<typeof RetirementTargetSchema>;

export const RetirementHousingOverrideSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("own-outright") }),
  z.strictObject({ kind: z.literal("mortgage-ends-before-retirement") }),
  z.strictObject({
    kind: z.literal("rent-for-life"),
    monthlyRentGbp: Money,
    realRentGrowthRate: z.number().finite().min(-0.2).max(0.5).optional(),
  }),
  z.strictObject({
    kind: z.literal("custom"),
    monthlyAmountGbp: Money,
  }),
  z.strictObject({
    kind: z.literal("mortgage-continues"),
    monthlyPaymentGbp: Money,
    remainingYearsInRetirement: z.number().finite().min(0).max(60),
  }),
]);
export type RetirementHousingOverrideDto = z.infer<typeof RetirementHousingOverrideSchema>;

export const UpsertRetirementPlanRequest = z
  .strictObject({
    retirementAge: z.number().int().min(18).max(110).nullable().optional(),
    planToAge: z.number().int().min(19).max(120).nullable().optional(),
    target: RetirementTargetSchema.nullable().optional(),
    housingOverride: RetirementHousingOverrideSchema.nullable().optional(),
    statePensionAge: z.number().int().min(50).max(85).nullable().optional(),
    statePensionAnnualForecastGbp: Money.nullable().optional(),
    statePensionQualifyingYears: z.number().int().min(0).max(50).nullable().optional(),
    growthRates: RetirementGrowthRatesSchema.optional(),
    inflationRate: z.number().finite().min(-0.2).max(0.5).optional(),
    cashSavingsNominalRate: z.number().finite().min(-0.2).max(0.5).nullable().optional(),
    realRentGrowthRate: z.number().finite().min(-0.2).max(0.5).optional(),
    excludedAccountIds: z.array(Uuid).max(200).optional(),
  })
  .refine(
    (v) =>
      v.retirementAge === undefined ||
      v.retirementAge === null ||
      v.planToAge === undefined ||
      v.planToAge === null ||
      v.planToAge > v.retirementAge,
    {
      message: "planToAge must be greater than retirementAge",
      path: ["planToAge"],
    },
  );
export type UpsertRetirementPlanRequest = z.infer<typeof UpsertRetirementPlanRequest>;

export const RetirementPlanDto = z.strictObject({
  id: Uuid,
  userId: z.string().min(1),
  retirementAge: z.number().int().nullable(),
  planToAge: z.number().int().nullable(),
  target: RetirementTargetSchema.nullable(),
  housingOverride: RetirementHousingOverrideSchema.nullable(),
  statePensionAge: z.number().int().nullable(),
  statePensionAnnualForecastGbp: ResponseMoney.nullable(),
  statePensionQualifyingYears: z.number().int().nullable(),
  growthRates: RetirementGrowthRatesSchema,
  inflationRate: z.number().finite(),
  cashSavingsNominalRate: z.number().finite().nullable(),
  realRentGrowthRate: z.number().finite(),
  excludedAccountIds: z.array(Uuid),
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
});
export type RetirementPlanDto = z.infer<typeof RetirementPlanDto>;

export const RetirementPlanResponse = z.strictObject({
  plan: RetirementPlanDto,
});
export type RetirementPlanResponse = z.infer<typeof RetirementPlanResponse>;
