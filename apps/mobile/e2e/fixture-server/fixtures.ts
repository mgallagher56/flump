/**
 * Canned `/v1` bodies (E12 S2c). Each is parsed with its contract schema whenever it is built: once
 * when the server starts, so a contract change that breaks a canned body stops the server (and its
 * tests) before any flow runs, and again on each request.
 */
import { randomUUID } from "node:crypto";
import {
  ClientPolicyResponse,
  type UserProfileResponse,
  UserProfileResponse as UserProfileSchema,
} from "@flump/api-contract";

/** The person the stand-in signs in. Made up; the address is on the reserved example.com domain. */
export const FIXTURE_PERSON = {
  firstName: "Sam",
  lastName: "Taylor",
  email: "sam.taylor@example.com",
} as const;

export function cannedProfile(userId: string, now: Date): UserProfileResponse {
  return UserProfileSchema.parse({
    id: randomUUID(),
    userId,
    email: FIXTURE_PERSON.email,
    firstName: FIXTURE_PERSON.firstName,
    lastName: FIXTURE_PERSON.lastName,
    avatarUrl: null,
    currency: "GBP",
    country: "GB",
    employmentType: null,
    annualSalary: null,
    monthlyTakeHome: null,
    secondIncomeMonthly: null,
    hasRentalIncome: false,
    rentalIncomeMonthly: null,
    hasMortgage: false,
    mortgageType: "repayment",
    propertyOwnershipShare: 100,
    pensionPercent: null,
    pensionEmployerPercent: null,
    isSalarySacrifice: null,
    isSalarySacrificeEmployerNi: false,
    setupChecklistCompletedSteps: [],
    setupChecklistDismissed: false,
    customBudgetCategories: [],
    enabledPages: [],
    dashboardWidgets: [],
    dashboardWidgetOrder: [],
    hasResetFinancialData: false,
    onboardingCompleted: true,
    taxRegion: null,
    birthYear: null,
    checkInDay: null,
    studentLoanPlans: null,
    housingStatus: null,
    monthlyHousingCost: null,
    monthlyOtherOutgoings: null,
    netWorthCountsProperty: true,
    netWorthCountsStudentLoan: false,
    partnerMode: false,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  });
}

export function cannedClientPolicy(minVersion: string) {
  const platform = { minVersion, recommendedVersion: minVersion };
  return ClientPolicyResponse.parse({ ios: platform, android: platform });
}
