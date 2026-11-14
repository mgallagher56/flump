import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { DEFAULT_PROFILE, normalizeProfile, useUserProfile } from "./useUserProfile";

const jsonRes = (body: unknown, status = 200) =>
  new Response(body === undefined ? null : JSON.stringify(body), { status });

describe("useUserProfile", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    vi.stubGlobal("ENV", { VITE_API_URL: "https://api.example.test" });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  test("normalizeProfile drops the retired forecast module key everywhere", () => {
    const profile = normalizeProfile({
      enabledPages: ["accounts", "forecast", "tax"],
      dashboardWidgets: ["accounts", "forecast"],
      dashboardWidgetOrder: ["forecast", "accounts"],
      dashboardWidgetSizes: { accounts: "wide", forecast: "normal" },
      dashboardWidgetConfig: { forecast: { forecastYears: 20 }, accounts: {} },
    });

    expect(profile.enabledPages).toEqual(["accounts", "tax"]);
    expect(profile.dashboardWidgets).toEqual(["accounts"]);
    expect(profile.dashboardWidgetOrder).toEqual(["accounts"]);
    expect(profile.dashboardWidgetSizes).toEqual({ accounts: "wide" });
    expect(profile.dashboardWidgetConfig).toEqual({ accounts: {} });
    expect(DEFAULT_PROFILE.enabledPages).not.toContain("forecast");
  });

  test("normalizeProfile falls back to default sizes when only forecast was stored", () => {
    const profile = normalizeProfile({ dashboardWidgetSizes: { forecast: "normal" } });
    expect(profile.dashboardWidgetSizes).toEqual(DEFAULT_PROFILE.dashboardWidgetSizes);
  });

  test("normalizeProfile handles partial data correctly", () => {
    const profile = normalizeProfile({
      displayName: "Jane Doe",
      annualSalary: 60000,
      hasMortgage: true,
    });

    expect(profile.displayName).toBe("Jane Doe");
    expect(profile.annualSalary).toBe(60000);
    expect(profile.hasMortgage).toBe(true);
    expect(profile.currency).toBe("GBP");
  });

  test("setProfile updates atom state", () => {
    const { result } = renderHook(() => useUserProfile());

    act(() => {
      result.current.setProfile({
        displayName: "John Smith",
        annualSalary: 75000,
      });
    });

    expect(result.current.profile.displayName).toBe("John Smith");
    expect(result.current.profile.annualSalary).toBe(75000);
  });

  test("never sends a browser access token: it calls the same-origin proxy", async () => {
    (global.fetch as any).mockResolvedValueOnce(jsonRes({}));
    const { result } = renderHook(() => useUserProfile());

    await result.current.updateProfile({ displayName: "X" });
    const [url, init] = (global.fetch as any).mock.calls[0];
    expect(url).toBe("/api/user-profile");
    expect(init.headers.Authorization).toBeUndefined();
  });

  test("updateProfile rejects with an unavailable BackendError on 503", async () => {
    (global.fetch as any).mockResolvedValueOnce(jsonRes(undefined, 503));
    const { result } = renderHook(() => useUserProfile());
    await expect(result.current.updateProfile({ displayName: "X" })).rejects.toMatchObject({
      name: "BackendError",
      kind: "server",
    });
    (global.fetch as any).mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await expect(result.current.updateProfile({ displayName: "X" })).rejects.toMatchObject({
      kind: "unavailable",
    });
  });

  test("updateProfile sends PATCH request and updates state", async () => {
    const mockUpdated = {
      ...DEFAULT_PROFILE,
      displayName: "Updated User",
      annualSalary: 80000,
    };

    (global.fetch as any).mockResolvedValueOnce(jsonRes(mockUpdated));

    const { result } = renderHook(() => useUserProfile());

    await act(async () => {
      await result.current.updateProfile({ displayName: "Updated User" });
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/user-profile"),
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ displayName: "Updated User" }),
      }),
    );
    expect(result.current.profile.displayName).toBe("Updated User");
  });

  test("markChecklistStep sends checklist update", async () => {
    const mockUpdated = {
      ...DEFAULT_PROFILE,
      setupChecklistCompletedSteps: ["step1"],
    };

    (global.fetch as any).mockResolvedValueOnce(jsonRes(mockUpdated));

    const { result } = renderHook(() => useUserProfile());

    await act(async () => {
      await result.current.markChecklistStep("step1", true);
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/user-profile/checklist"),
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ step: "step1", completed: true }),
      }),
    );
  });

  test("sendPasswordResetEmail sends request", async () => {
    (global.fetch as any).mockResolvedValueOnce(
      jsonRes({ success: true, message: "Reset email sent" }),
    );

    const { result } = renderHook(() => useUserProfile());

    const response = await result.current.sendPasswordResetEmail();
    expect(response.success).toBe(true);
    expect("changePassword" in result.current).toBe(false);
  });

  test("resetFinancialData sends reset request", async () => {
    const mockUpdated = {
      ...DEFAULT_PROFILE,
      hasResetFinancialData: true,
    };

    (global.fetch as any).mockResolvedValueOnce(jsonRes(mockUpdated));

    const { result } = renderHook(() => useUserProfile());

    await act(async () => {
      await result.current.resetFinancialData();
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/user-profile/reset-financial-data"),
      expect.objectContaining({
        method: "POST",
      }),
    );
    const [, init] = (global.fetch as any).mock.calls.at(-1);
    expect(JSON.parse(init.body)).toEqual({ confirmation: "RESET" });
  });
});
