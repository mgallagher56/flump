import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_FINANCIAL_BASELINE } from "~/state/baseline.store";
import {
  DEFAULT_PROFILE,
  HttpProfileAdapter,
  normalizeProfile,
  profileToBaseline,
  useUserProfile,
} from "./useUserProfile";

const mockRootData = { accessToken: "test-token" };
vi.mock("react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router")>()),
  useRouteLoaderData: () => mockRootData,
}));

const jsonRes = (body: unknown, status = 200) =>
  new Response(body === undefined ? null : JSON.stringify(body), { status });

describe("useUserProfile & HttpProfileAdapter", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
    vi.stubGlobal("ENV", { VITE_API_URL: "https://api.example.test" });
  });

  afterEach(() => {
    global.fetch = originalFetch;
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
    const { result } = renderHook(() => useUserProfile());

    // updateProfile success
    (global.fetch as any).mockResolvedValueOnce(
      jsonRes({ ...DEFAULT_PROFILE, displayName: "Updated User" }),
    );
    await act(async () => {
      await result.current.updateProfile({ displayName: "Updated User" });
    });
    expect(result.current.profile.displayName).toBe("Updated User");

    // updateProfile error
    (global.fetch as any).mockResolvedValueOnce(jsonRes(undefined, 503));
    await expect(result.current.updateProfile({ displayName: "Fail" })).rejects.toThrow(/server/);

    // markChecklistStep success & failure
    (global.fetch as any).mockResolvedValueOnce(
      jsonRes({ ...DEFAULT_PROFILE, setupChecklistCompletedSteps: ["budget"] }),
    );
    await act(async () => {
      await result.current.markChecklistStep("budget", true);
    });
    expect(result.current.profile.setupChecklistCompletedSteps).toEqual(["budget"]);

    (global.fetch as any).mockResolvedValueOnce(jsonRes(undefined, 503));
    await expect(result.current.markChecklistStep("budget", false)).rejects.toThrow(/server/);

    // sendPasswordResetEmail success & failure
    (global.fetch as any).mockResolvedValueOnce(jsonRes({ success: true, message: "Reset sent" }));
    const resetRes = await result.current.sendPasswordResetEmail();
    expect(resetRes.success).toBe(true);

    (global.fetch as any).mockResolvedValueOnce(jsonRes({}, 400));
    await expect(result.current.sendPasswordResetEmail()).rejects.toThrow(
      "Failed to send password reset email",
    );

    // resetFinancialData success & failure
    (global.fetch as any).mockResolvedValueOnce(
      jsonRes({ profile: { ...DEFAULT_PROFILE, hasResetFinancialData: true } }),
    );
    await act(async () => {
      await result.current.resetFinancialData();
    });
    expect(result.current.profile.hasResetFinancialData).toBe(true);

    (global.fetch as any).mockResolvedValueOnce(jsonRes({ message: "Reset failed" }, 400));
    await expect(result.current.resetFinancialData()).rejects.toThrow("Reset failed");
  });

  it("shows backend text only for 4xx other than 401 and 403", async () => {
    const { result } = renderHook(() => useUserProfile());
    for (const status of [401, 403, 500, 503]) {
      (global.fetch as any).mockResolvedValueOnce(
        jsonRes({ message: "Internal stack trace" }, status),
      );
      await expect(result.current.sendPasswordResetEmail()).rejects.toThrow(
        "Failed to send password reset email",
      );
    }
    (global.fetch as any).mockResolvedValueOnce(jsonRes({ message: "boom" }, 500));
    await expect(result.current.sendPasswordResetEmail()).rejects.toThrow(
      "Failed to send password reset email",
    );
    (global.fetch as any).mockResolvedValueOnce(jsonRes({ message: "boom" }, 403));
    await expect(result.current.resetFinancialData()).rejects.toThrow(
      "Failed to reset financial data",
    );
  });

  it("does not store an empty response as the profile", async () => {
    const { result } = renderHook(() => useUserProfile());
    const before = result.current.profile;
    (global.fetch as any).mockResolvedValueOnce(jsonRes(undefined, 204));
    await expect(result.current.updateProfile({ displayName: "X" })).rejects.toMatchObject({
      kind: "bad-response",
    });
    (global.fetch as any).mockResolvedValueOnce(new Response("", { status: 200 }));
    await expect(result.current.markChecklistStep("budget", true)).rejects.toMatchObject({
      kind: "bad-response",
    });
    expect(result.current.profile).toBe(before);
  });

  it("maps a profile with no salary to a baseline with no salary, never 45,000", () => {
    expect(profileToBaseline({ ...DEFAULT_PROFILE, annualSalary: null }).annualGrossSalary).toBe(0);
    expect(profileToBaseline({ ...DEFAULT_PROFILE, annualSalary: 52000 }).annualGrossSalary).toBe(
      52000,
    );
  });

  it("exercises HttpProfileAdapter methods", async () => {
    const adapter = new HttpProfileAdapter(() => "custom-token");

    (global.fetch as any).mockResolvedValueOnce(
      jsonRes({ ...DEFAULT_PROFILE, annualSalary: 68000 }),
    );
    const baseline = await adapter.getBaseline();
    expect(baseline?.annualGrossSalary).toBe(68000);

    (global.fetch as any).mockResolvedValueOnce(jsonRes(undefined, 503));
    await expect(adapter.getBaseline()).rejects.toMatchObject({ kind: "server" });

    (global.fetch as any).mockResolvedValueOnce(jsonRes(undefined, 204));
    await adapter.saveBaseline(DEFAULT_FINANCIAL_BASELINE);
    expect(global.fetch).toHaveBeenCalled();

    adapter.saveSeed({ mode: "WEALTH", annualGrossSalary: 90000, timestamp: Date.now() });
    expect(adapter.getSeed()?.annualGrossSalary).toBe(90000);
    adapter.clearSeed();
    expect(adapter.getSeed()).toBeNull();
  });
});
