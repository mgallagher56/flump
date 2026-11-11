import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_FINANCIAL_BASELINE } from "~/state/baseline.store";
import {
  DEFAULT_PROFILE,
  HttpProfileAdapter,
  normalizeProfile,
  useUserProfile,
} from "./useUserProfile";

const mockRootData = { accessToken: "test-token" };
vi.mock("react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router")>()),
  useRouteLoaderData: () => mockRootData,
}));

describe("useUserProfile & HttpProfileAdapter", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
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

  it("updates profile, checklist, password, and resets financial data via API", async () => {
    const { result } = renderHook(() => useUserProfile());

    // updateProfile success
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...DEFAULT_PROFILE, displayName: "Updated User" }),
    });
    await act(async () => {
      await result.current.updateProfile({ displayName: "Updated User" });
    });
    expect(result.current.profile.displayName).toBe("Updated User");

    // updateProfile error
    (global.fetch as any).mockResolvedValueOnce({ ok: false });
    await expect(result.current.updateProfile({ displayName: "Fail" })).rejects.toThrow(
      "Failed to update profile",
    );

    // markChecklistStep success & failure
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...DEFAULT_PROFILE, setupChecklistCompletedSteps: ["budget"] }),
    });
    await act(async () => {
      await result.current.markChecklistStep("budget", true);
    });
    expect(result.current.profile.setupChecklistCompletedSteps).toEqual(["budget"]);

    (global.fetch as any).mockResolvedValueOnce({ ok: false });
    await expect(result.current.markChecklistStep("budget", false)).rejects.toThrow(
      "Failed to update checklist",
    );

    // changePassword success & failure
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, message: "Password updated" }),
    });
    const pwRes = await result.current.changePassword("NewSecret123!");
    expect(pwRes.success).toBe(true);

    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: "Weak password" }),
    });
    await expect(result.current.changePassword("123")).rejects.toThrow("Weak password");

    // sendPasswordResetEmail success & failure
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, message: "Reset sent" }),
    });
    const resetRes = await result.current.sendPasswordResetEmail("user@example.com");
    expect(resetRes.success).toBe(true);

    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    });
    await expect(result.current.sendPasswordResetEmail("user@example.com")).rejects.toThrow(
      "Failed to send password reset email",
    );

    // resetFinancialData success & failure
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ profile: { ...DEFAULT_PROFILE, hasResetFinancialData: true } }),
    });
    await act(async () => {
      await result.current.resetFinancialData();
    });
    expect(result.current.profile.hasResetFinancialData).toBe(true);

    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: "Reset failed" }),
    });
    await expect(result.current.resetFinancialData()).rejects.toThrow("Reset failed");
  });

  it("exercises HttpProfileAdapter methods", async () => {
    const adapter = new HttpProfileAdapter(() => "custom-token");

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...DEFAULT_PROFILE, annualSalary: 68000 }),
    });
    const baseline = await adapter.getBaseline();
    expect(baseline?.annualGrossSalary).toBe(68000);

    (global.fetch as any).mockResolvedValueOnce({ ok: false });
    expect(await adapter.getBaseline()).toBeNull();

    (global.fetch as any).mockResolvedValueOnce({ ok: true });
    await adapter.saveBaseline(DEFAULT_FINANCIAL_BASELINE);
    expect(global.fetch).toHaveBeenCalled();

    adapter.saveSeed({ mode: "WEALTH", annualGrossSalary: 90000, timestamp: Date.now() });
    expect(adapter.getSeed()?.annualGrossSalary).toBe(90000);
    adapter.clearSeed();
    expect(adapter.getSeed()).toBeNull();
  });
});
