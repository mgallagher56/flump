import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { DEFAULT_PROFILE, normalizeProfile, useUserProfile } from "./useUserProfile";

describe("useUserProfile", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
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

  test("updateProfile sends PATCH request and updates state", async () => {
    const mockUpdated = {
      ...DEFAULT_PROFILE,
      displayName: "Updated User",
      annualSalary: 80000,
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockUpdated,
    });

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

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockUpdated,
    });

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

  test("changePassword sends POST request", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, message: "Password updated" }),
    });

    const { result } = renderHook(() => useUserProfile());

    const response = await result.current.changePassword("newSecretPassword123!");
    expect(response.success).toBe(true);
  });

  test("sendPasswordResetEmail sends request", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, message: "Reset email sent" }),
    });

    const { result } = renderHook(() => useUserProfile());

    const response = await result.current.sendPasswordResetEmail("test@example.com");
    expect(response.success).toBe(true);
  });

  test("resetFinancialData sends reset request", async () => {
    const mockUpdated = {
      ...DEFAULT_PROFILE,
      hasResetFinancialData: true,
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockUpdated,
    });

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
  });
});
