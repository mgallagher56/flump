import { describe, expect, it } from "vitest";
import {
  ResetFinancialDataResponse,
  SendPasswordResetResponse,
  UpdateChecklistResponse,
  UpdateProfileResponse,
  UserProfileDto,
  UserProfileResponse,
} from "./domains/profile.js";
import { checkAgainst } from "./validate.js";

/** `UserProfileService.formatProfile` output for a fresh profile, after JSON serialisation. */
const profile = {
  id: "6f1c2b9e-3d4a-4b5c-8d6e-7f8091a2b3c4",
  userId: "user_01JABCDEF",
  email: "sam@example.com",
  firstName: "Sam",
  lastName: null,
  avatarUrl: null,
  currency: "GBP",
  country: "GB",
  employmentType: "employed",
  annualSalary: 42000,
  monthlyTakeHome: 2750.5,
  secondIncomeMonthly: null,
  hasRentalIncome: false,
  rentalIncomeMonthly: null,
  hasMortgage: true,
  mortgageType: "repayment",
  propertyOwnershipShare: 50,
  pensionPercent: 5,
  pensionEmployerPercent: 3,
  isSalarySacrifice: false,
  isSalarySacrificeEmployerNi: false,
  setupChecklistCompletedSteps: ["profile"],
  setupChecklistDismissed: false,
  customBudgetCategories: [],
  enabledPages: ["accounts", "budget", "savings", "pension", "mortgage"],
  dashboardWidgets: ["accounts", "budget"],
  dashboardWidgetOrder: ["accounts", "budget"],
  hasResetFinancialData: false,
  onboardingCompleted: true,
  taxRegion: "SCOTLAND",
  birthYear: 1990,
  checkInDay: null,
  studentLoanPlans: [],
  housingStatus: "mortgage",
  monthlyHousingCost: 812.5,
  monthlyOtherOutgoings: null,
  netWorthCountsProperty: true,
  netWorthCountsStudentLoan: false,
  createdAt: "2026-11-01T09:00:00.000Z",
  updatedAt: "2026-11-13T10:15:00.000Z",
};

describe("profile response schemas", () => {
  it.each([
    ["UserProfileResponse", UserProfileResponse],
    ["UpdateProfileResponse", UpdateProfileResponse],
    ["UpdateChecklistResponse", UpdateChecklistResponse],
  ])("%s accepts the formatted profile", (_name, schema) => {
    expect(checkAgainst(schema, profile)).toEqual({ ok: true });
  });

  it("carries none of the retired profile fields (system audit slice 9 part two)", () => {
    const retired = [
      "hasBuyToLet",
      "buyToLetCount",
      "buyToLetPropertyValue",
      "buyToLetMonthlyRental",
      "buyToLetMortgageBalance",
      "buyToLetMortgageRate",
      "buyToLetMortgageType",
      "monthlySavingsTarget",
      "savingsAllocationMode",
      "savingsDefaultInterestRate",
      "dashboardWidgetSizes",
      "dashboardWidgetConfig",
    ];
    const shapeKeys = Object.keys(UserProfileDto.shape);
    expect(retired.filter((key) => shapeKeys.includes(key))).toEqual([]);
    expect(checkAgainst(UserProfileResponse, { ...profile, monthlySavingsTarget: 300 }).ok).toBe(
      false,
    );
  });

  it("carries neither displayName nor hasSecondIncome (system audit slice 9 part three)", () => {
    // Their only reader was the deleted apps/mobile-companion. PATCH still accepts them for one
    // release and stores nothing (profile.test.ts, user-profile.service.spec.ts).
    const shapeKeys = Object.keys(UserProfileDto.shape);
    expect(["displayName", "hasSecondIncome"].filter((key) => shapeKeys.includes(key))).toEqual([]);
    expect(shapeKeys).toContain("secondIncomeMonthly");
    for (const extra of [{ displayName: null }, { hasSecondIncome: false }]) {
      expect(checkAgainst(UserProfileResponse, { ...profile, ...extra }).ok).toBe(false);
      expect(checkAgainst(UpdateProfileResponse, { ...profile, ...extra }).ok).toBe(false);
      expect(checkAgainst(UpdateChecklistResponse, { ...profile, ...extra }).ok).toBe(false);
    }
  });

  it("rejects a decimal column that arrives as a string (B-05)", () => {
    expect(checkAgainst(UserProfileResponse, { ...profile, annualSalary: "42000.00" }).ok).toBe(
      false,
    );
  });

  it("rejects an absent nullable key and an extra key", () => {
    const { avatarUrl: _avatarUrl, ...missing } = profile;
    expect(checkAgainst(UserProfileResponse, missing).ok).toBe(false);
    expect(checkAgainst(UpdateChecklistResponse, { ...profile, internal: 1 }).ok).toBe(false);
  });

  it("SendPasswordResetResponse accepts success only", () => {
    expect(checkAgainst(SendPasswordResetResponse, { success: true })).toEqual({ ok: true });
    expect(checkAgainst(SendPasswordResetResponse, { success: true, email: "x" }).ok).toBe(false);
  });

  it("ResetFinancialDataResponse nests the profile strictly", () => {
    const body = {
      success: true,
      message: "All financial data has been reset",
      profile: { ...profile, hasResetFinancialData: true, pensionPercent: 0 },
    };
    expect(checkAgainst(ResetFinancialDataResponse, body)).toEqual({ ok: true });
    expect(
      checkAgainst(ResetFinancialDataResponse, {
        ...body,
        profile: { ...body.profile, monthlyHousingCost: "812.50" },
      }).ok,
    ).toBe(false);
  });
});
