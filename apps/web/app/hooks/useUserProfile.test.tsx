import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { profileFixture } from "~/test/fixtures/contractResponses";
import { profileBackend } from "~/test/profileBackend";
import { withRootLoader } from "~/test/rootLoaderRouter";

// The real router: the profile is the root loader's, and a save reloads it (audit slice 8).
vi.mock("react-router", async () => await vi.importActual("react-router"));

const { forgetWrittenProfileVersion, normalizeProfile, useUserProfile } = await import(
  "./useUserProfile"
);

describe("useUserProfile", () => {
  let api: ReturnType<typeof profileBackend>;
  const renderProfileHook = () =>
    renderHook(() => useUserProfile(), {
      wrapper: withRootLoader(() => ({ userProfile: api.state.saved })),
    });

  beforeEach(() => {
    api = profileBackend();
    forgetWrittenProfileVersion();
    vi.stubGlobal("fetch", api.fetchMock);
    vi.stubGlobal("ENV", { VITE_API_URL: "https://api.example.test" });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("normalizes partial profile fields accurately", () => {
    const norm = normalizeProfile({
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
      age: 34,
      studentLoanPlan: "plan2",
      housingStatus: "mortgage",
      monthlyHousingCost: 1400,
      monthlyOtherOutgoings: 900,
      totalCashSavings: 15000,
      totalPensionPot: 45000,
      totalUnsecuredDebt: 2000,
      homeValue: 350000,
      mortgageBalance: 240000,
      annualSalary: 75000,
      monthlyTakeHome: 4300,
      secondIncomeMonthly: 500,
      rentalIncomeMonthly: 800,
      propertyOwnershipShare: 50,
      hasBuyToLet: true,
      buyToLetCount: 2,
      buyToLetPropertyValue: 200000,
      buyToLetMonthlyRental: 1100,
      buyToLetMortgageBalance: 140000,
      buyToLetMortgageRate: 4.8,
      pensionPercent: 8,
      pensionEmployerPercent: 5,
      isSalarySacrifice: false,
      isSalarySacrificeEmployerNi: true,
      monthlySavingsTarget: 600,
      savingsDefaultInterestRate: 4.5,
    });

    expect(norm.firstName).toBe("Jane");
    expect(norm.age).toBe(34);
    expect(norm.annualSalary).toBe(75000);
    expect(norm.hasBuyToLet).toBe(true);
    expect(norm.buyToLetCount).toBe(2);
    expect(norm.isSalarySacrifice).toBe(false);
    expect(norm.isSalarySacrificeEmployerNi).toBe(true);
  });

  it("updates profile, checklist, and resets financial data via API", async () => {
    const { result } = renderProfileHook();

    // updateProfile success: slice 8 reloads saved data rather than storing the response.
    api.answer({ ...profileFixture, displayName: "Updated User" });
    await act(async () => {
      await result.current.updateProfile({ displayName: "Updated User" });
    });
    await waitFor(() => expect(result.current.profile.displayName).toBe("Updated User"));

    // updateProfile error
    api.answer(undefined, 503);
    await expect(result.current.updateProfile({ displayName: "Fail" })).rejects.toThrow(/server/);

    // markChecklistStep success & failure
    api.answer({ ...profileFixture, setupChecklistCompletedSteps: ["budget"] });
    await act(async () => {
      await result.current.markChecklistStep("budget", true);
    });
    await waitFor(() =>
      expect(result.current.profile.setupChecklistCompletedSteps).toEqual(["budget"]),
    );

    api.answer(undefined, 503);
    await expect(result.current.markChecklistStep("budget", false)).rejects.toThrow(/server/);

    // sendPasswordResetEmail success & failure
    api.answer({ success: true });
    const resetRes = await result.current.sendPasswordResetEmail();
    expect(resetRes.success).toBe(true);

    api.answer({}, 400);
    await expect(result.current.sendPasswordResetEmail()).rejects.toThrow(
      "We could not send the password reset email. Try again.",
    );

    // resetFinancialData success & failure
    api.answer({
      success: true,
      message: "Financial data reset",
      profile: { ...profileFixture, hasResetFinancialData: true },
    });
    await act(async () => {
      await result.current.resetFinancialData();
    });
    await waitFor(() => expect(result.current.profile.hasResetFinancialData).toBe(true));

    api.answer({ message: "Reset failed" }, 400);
    await expect(result.current.resetFinancialData()).rejects.toThrow("Reset failed");
  });

  it("shows backend text only for 4xx other than 401 and 403", async () => {
    const { result } = renderProfileHook();
    for (const status of [401, 403, 500, 503]) {
      api.answer({ message: "Internal stack trace" }, status);
      await expect(result.current.sendPasswordResetEmail()).rejects.toThrow(
        "We could not send the password reset email. Try again.",
      );
    }
    api.answer({ message: "boom" }, 500);
    await expect(result.current.sendPasswordResetEmail()).rejects.toThrow(
      "We could not send the password reset email. Try again.",
    );
    // A 403 on reset is the recent-login check (RecentLoginRequiredError, see useUserProfile.test.ts).
    api.answer({ message: "boom" }, 401);
    await expect(result.current.resetFinancialData()).rejects.toThrow(
      "We could not reset your financial data. Try again.",
    );
  });

  it("does not store an empty response as the profile", async () => {
    const { result } = renderProfileHook();
    const before = result.current.profile;
    api.answer(undefined, 204);
    await expect(result.current.updateProfile({ displayName: "X" })).rejects.toMatchObject({
      kind: "bad-response",
    });
    api.answerWith(() => new Response("", { status: 200 }));
    await expect(result.current.markChecklistStep("budget", true)).rejects.toMatchObject({
      kind: "bad-response",
    });
    expect(result.current.profile).toBe(before);
  });
});
