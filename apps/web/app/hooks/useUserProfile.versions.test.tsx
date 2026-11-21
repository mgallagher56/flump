import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registerSavedDataReload } from "~/services/conflict";
import { profileFixture } from "~/test/fixtures/contractResponses";
import { profileBackend } from "~/test/profileBackend";
import { withRootLoader } from "~/test/rootLoaderRouter";
import {
  DEFAULT_PROFILE,
  forgetWrittenProfileVersion,
  normalizeProfile,
  useUserProfile,
} from "./useUserProfile";

// The real router: the profile is the root loader's, and a save reloads it (audit slice 8).
vi.mock("react-router", async () => await vi.importActual("react-router"));

// No toast provider: a page outside the app shell still handles a conflict.
vi.mock("@repo/ui", () => ({ useOptionalToast: () => undefined }));

const SIX_PAGES = ["accounts", "budget", "debt", "savings", "pension", "mortgage"];

describe("normalizeProfile", () => {
  it("fills every unanswered field with its default and presumes no answer", () => {
    expect(normalizeProfile({})).toEqual({
      id: "",
      userId: "",
      firstName: null,
      lastName: null,
      email: null,
      avatarUrl: null,
      currency: "GBP",
      country: "GB",
      age: null,
      birthYear: null,
      checkInDay: null,
      taxRegion: null,
      studentLoanPlans: null,
      studentLoanPlan: null,
      employmentType: null,
      annualSalary: null,
      monthlyTakeHome: null,
      secondIncomeMonthly: null,
      hasRentalIncome: false,
      rentalIncomeMonthly: null,
      housingStatus: null,
      monthlyHousingCost: null,
      monthlyOtherOutgoings: null,
      totalCashSavings: null,
      totalPensionPot: null,
      totalUnsecuredDebt: null,
      hasMortgage: false,
      mortgageType: "repayment",
      homeValue: null,
      mortgageBalance: null,
      propertyOwnershipShare: 100,
      pensionPercent: null,
      pensionEmployerPercent: null,
      isSalarySacrifice: null,
      isSalarySacrificeEmployerNi: false,
      setupChecklistCompletedSteps: [],
      setupChecklistDismissed: false,
      enabledPages: SIX_PAGES,
      dashboardWidgets: SIX_PAGES,
      dashboardWidgetOrder: [],
      customBudgetCategories: [],
      hasResetFinancialData: false,
      onboardingCompleted: false,
      createdAt: "",
      updatedAt: "",
    });
  });

  it("reads stored text figures as numbers, keeps zero, and reads flags as true or false", () => {
    const profile = normalizeProfile({
      firstName: "Sam",
      lastName: "Patel",
      email: "sam@example.com",
      avatarUrl: "https://example.com/a.png",
      age: "34",
      birthYear: "1991",
      checkInDay: "15",
      taxRegion: "WALES",
      studentLoanPlans: ["plan1"],
      studentLoanPlan: "plan2",
      housingStatus: "renting",
      monthlyHousingCost: "1200",
      monthlyOtherOutgoings: "0",
      totalCashSavings: "2500.5",
      totalPensionPot: "0",
      totalUnsecuredDebt: "300",
      homeValue: "0",
      mortgageBalance: "0",
      annualSalary: 0,
      monthlyTakeHome: "2100",
      secondIncomeMonthly: "0",
      rentalIncomeMonthly: "450",
      propertyOwnershipShare: "50",
      pensionPercent: "0",
      pensionEmployerPercent: "3",
      isSalarySacrifice: 1,
      isSalarySacrificeEmployerNi: 1,
      hasResetFinancialData: 1,
      setupChecklistDismissed: 1,
      onboardingCompleted: 1,
      mortgageType: "interest-only",
    } as never);
    expect(profile).toMatchObject({
      firstName: "Sam",
      lastName: "Patel",
      email: "sam@example.com",
      avatarUrl: "https://example.com/a.png",
      age: 34,
      birthYear: 1991,
      checkInDay: 15,
      taxRegion: "WALES",
      studentLoanPlans: ["plan1"],
      studentLoanPlan: "plan2",
      housingStatus: "renting",
      monthlyHousingCost: 1200,
      monthlyOtherOutgoings: 0,
      totalCashSavings: 2500.5,
      totalPensionPot: 0,
      totalUnsecuredDebt: 300,
      homeValue: 0,
      mortgageBalance: 0,
      annualSalary: 0,
      monthlyTakeHome: 2100,
      secondIncomeMonthly: 0,
      rentalIncomeMonthly: 450,
      propertyOwnershipShare: 50,
      pensionPercent: 0,
      pensionEmployerPercent: 3,
      isSalarySacrifice: true,
      isSalarySacrificeEmployerNi: true,
      hasResetFinancialData: true,
      setupChecklistDismissed: true,
      onboardingCompleted: true,
      mortgageType: "interest-only",
    });
  });

  it("keeps a stored null as not answered, except the defaults that cannot be blank", () => {
    const profile = normalizeProfile({
      firstName: null,
      lastName: null,
      email: null,
      avatarUrl: null,
      age: null,
      birthYear: null,
      checkInDay: null,
      taxRegion: null,
      studentLoanPlans: "plan1",
      studentLoanPlan: null,
      housingStatus: null,
      monthlyHousingCost: null,
      monthlyOtherOutgoings: null,
      totalCashSavings: null,
      totalPensionPot: null,
      totalUnsecuredDebt: null,
      homeValue: null,
      mortgageBalance: null,
      annualSalary: null,
      monthlyTakeHome: null,
      secondIncomeMonthly: null,
      rentalIncomeMonthly: null,
      propertyOwnershipShare: null,
      pensionPercent: null,
      pensionEmployerPercent: null,
      isSalarySacrifice: null,
      isSalarySacrificeEmployerNi: null,
      mortgageType: "",
      enabledPages: "accounts",
    } as never);
    expect(profile).toMatchObject({
      firstName: null,
      lastName: null,
      email: null,
      avatarUrl: null,
      age: null,
      birthYear: null,
      checkInDay: null,
      taxRegion: null,
      // Not a list, so not an answer.
      studentLoanPlans: null,
      studentLoanPlan: null,
      housingStatus: null,
      monthlyHousingCost: null,
      monthlyOtherOutgoings: null,
      totalCashSavings: null,
      totalPensionPot: null,
      totalUnsecuredDebt: null,
      homeValue: null,
      mortgageBalance: null,
      annualSalary: null,
      monthlyTakeHome: null,
      secondIncomeMonthly: null,
      rentalIncomeMonthly: null,
      propertyOwnershipShare: 100,
      pensionPercent: null,
      pensionEmployerPercent: null,
      isSalarySacrifice: null,
      isSalarySacrificeEmployerNi: false,
      mortgageType: "repayment",
      enabledPages: SIX_PAGES,
    });
  });

  it("reads as a profile with no answers when signed out", () => {
    expect(DEFAULT_PROFILE).toMatchObject({
      hasRentalIncome: false,
      isSalarySacrificeEmployerNi: false,
      setupChecklistCompletedSteps: [],
      setupChecklistDismissed: false,
      enabledPages: SIX_PAGES,
      dashboardWidgets: SIX_PAGES,
      customBudgetCategories: [],
      hasResetFinancialData: false,
      onboardingCompleted: false,
    });
  });
});

const V1 = "2026-11-14T09:30:00.123Z";
const V2 = "2026-11-15T10:00:00.000Z";
const V3 = "2026-11-15T10:05:00.000Z";
const OTHER_PROFILE_ID = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";

/**
 * The root loader keeps answering `loaded`, as when the reload after a save has not landed yet,
 * while each fetch answers the next queued body.
 */
function staleLoader(loaded: Record<string, unknown>) {
  const api = profileBackend();
  vi.stubGlobal("fetch", api.fetchMock);
  const saved = { ...profileFixture, ...loaded };
  const hook = renderHook(() => useUserProfile(), {
    wrapper: withRootLoader(() => ({ userProfile: saved })),
  });
  return { ...hook, api };
}

describe("useUserProfile versions while a reload is pending", () => {
  const reload = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("ENV", { VITE_API_URL: "https://api.example.test" });
    forgetWrittenProfileVersion();
    reload.mockReset();
    registerSavedDataReload(reload);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    registerSavedDataReload(null);
  });

  it("sends the version a checklist dismissal returned on the next save", async () => {
    const { result, api } = staleLoader({ updatedAt: V1 });
    api.answer({ ...profileFixture, setupChecklistDismissed: true, updatedAt: V2 });
    api.answer({ ...profileFixture, updatedAt: V3 });
    await act(async () => {
      await result.current.dismissChecklist();
      await result.current.updateProfile({ firstName: "One" });
    });
    expect(api.sentIfMatch(1)).toBe(`"${V2}"`);
  });

  it("ignores a version this tab wrote for a different profile", async () => {
    const { result, api } = staleLoader({ updatedAt: V1 });
    api.answer({ ...profileFixture, id: OTHER_PROFILE_ID, updatedAt: V3 });
    api.answer({ ...profileFixture, updatedAt: V3 });
    await act(async () => {
      await result.current.updateProfile({ firstName: "One" });
      await result.current.updateProfile({ firstName: "Two" });
    });
    expect(api.sentIfMatch(0)).toBe(`"${V1}"`);
    expect(api.sentIfMatch(1)).toBe(`"${V1}"`);
  });

  it("prefers a newer loaded version to an older one this tab wrote", async () => {
    const { result, api } = staleLoader({
      updatedAt: V3,
      setupChecklistCompletedSteps: ["profile"],
    });
    api.answer({ ...profileFixture, updatedAt: V2, setupChecklistCompletedSteps: [] });
    api.answer({ ...profileFixture, updatedAt: V3 });
    await act(async () => {
      await result.current.updateProfile({ firstName: "One" });
      // Done in the newer loaded profile, so nothing is sent.
      await result.current.markChecklistStep("profile", true);
      await result.current.updateProfile({ firstName: "Two" });
    });
    expect(api.fetchMock).toHaveBeenCalledTimes(2);
    expect(api.sentIfMatch(1)).toBe(`"${V3}"`);
  });

  it("handles a conflict without a toast provider: rejects with the 412 and reloads", async () => {
    const { result, api } = staleLoader({ updatedAt: V1 });
    api.answerWith(() => new Response(JSON.stringify({ kind: "client" }), { status: 412 }));
    let error: unknown;
    await act(async () => {
      error = await result.current.updateProfile({ firstName: "Lost" }).catch((e) => e);
    });
    expect((error as { status?: number }).status).toBe(412);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("shows the fixed message when a password reset email cannot be sent", async () => {
    const { result, api } = staleLoader({ updatedAt: V1 });
    api.answer(undefined, 503);
    const error = await result.current.sendPasswordResetEmail().catch((e) => e);
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe("We could not send the password reset email. Try again.");
  });
});
