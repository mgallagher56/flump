import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { profileFixture } from "~/test/fixtures/contractResponses";
import { profileBackend } from "~/test/profileBackend";
import { withRootLoader } from "~/test/rootLoaderRouter";

// The real router: the profile is the root loader's, and a save reloads it (audit slice 8).
vi.mock("react-router", async () => await vi.importActual("react-router"));

const {
  DEFAULT_PROFILE,
  forgetWrittenProfileVersion,
  normalizeProfile,
  RecentLoginRequiredError,
  useUserProfile,
} = await import("./useUserProfile");

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

  test("normalizeProfile drops the retired forecast module key everywhere", () => {
    const profile = normalizeProfile({
      enabledPages: ["accounts", "forecast", "tax"],
      dashboardWidgets: ["accounts", "forecast"],
      dashboardWidgetOrder: ["forecast", "accounts"],
    });

    expect(profile.enabledPages).toEqual(["accounts", "tax"]);
    expect(profile.dashboardWidgets).toEqual(["accounts"]);
    expect(profile.dashboardWidgetOrder).toEqual(["accounts"]);
    expect(DEFAULT_PROFILE.enabledPages).not.toContain("forecast");
  });

  test("normalizeProfile keeps no saved section order when none is stored", () => {
    // An empty order means the dashboard's default order; it is never filled in for the user.
    expect(normalizeProfile({}).dashboardWidgetOrder).toEqual([]);
    expect(DEFAULT_PROFILE.dashboardWidgetOrder).toEqual([]);
  });

  test("normalizeProfile handles partial data correctly", () => {
    const profile = normalizeProfile({
      firstName: "Jane Doe",
      annualSalary: 60000,
      hasMortgage: true,
    });

    expect(profile.firstName).toBe("Jane Doe");
    expect(profile.annualSalary).toBe(60000);
    expect(profile.hasMortgage).toBe(true);
    expect(profile.currency).toBe("GBP");
  });

  test("never sends a browser access token: it calls the same-origin proxy", async () => {
    const { result } = renderProfileHook();
    api.answer(profileFixture);

    await act(async () => {
      await result.current.updateProfile({ firstName: "X" });
    });
    const [url, init] = api.fetchMock.mock.calls[0];
    expect(url).toBe("/api/user-profile");
    expect((init?.headers as Record<string, string> | undefined)?.Authorization).toBeUndefined();
  });

  test("updateProfile rejects with an unavailable BackendError on 503", async () => {
    const { result } = renderProfileHook();
    api.answer(undefined, 503);
    await expect(result.current.updateProfile({ firstName: "X" })).rejects.toMatchObject({
      name: "BackendError",
      kind: "server",
    });
    api.answerWith(() => {
      throw new TypeError("Failed to fetch");
    });
    await expect(result.current.updateProfile({ firstName: "X" })).rejects.toMatchObject({
      kind: "unavailable",
    });
  });

  test("updateProfile sends a PATCH request, then shows the reloaded saved profile", async () => {
    const { result } = renderProfileHook();
    api.answer({ ...profileFixture, firstName: "Updated User", annualSalary: 80000 });

    await act(async () => {
      await result.current.updateProfile({ firstName: "Updated User" });
    });

    expect(api.fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/user-profile"),
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ firstName: "Updated User" }),
      }),
    );
    // Slice 8: the hook reloads saved data rather than storing the response.
    await waitFor(() => expect(result.current.profile.firstName).toBe("Updated User"));
  });

  test("markChecklistStep sends checklist update", async () => {
    const { result } = renderProfileHook();
    api.answer({ ...profileFixture, setupChecklistCompletedSteps: ["profile", "step1"] });

    await act(async () => {
      await result.current.markChecklistStep("step1", true);
    });

    expect(api.fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/user-profile/checklist"),
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ step: "step1", completed: true }),
      }),
    );
  });

  test("sendPasswordResetEmail sends request", async () => {
    const { result } = renderProfileHook();
    api.answer({ success: true });

    const response = await result.current.sendPasswordResetEmail();
    expect(response.success).toBe(true);
    expect("changePassword" in result.current).toBe(false);
  });

  test("resetFinancialData sends reset request", async () => {
    const { result } = renderProfileHook();
    api.answer({
      success: true,
      message: "Financial data reset",
      profile: { ...profileFixture, hasResetFinancialData: true },
    });

    await act(async () => {
      await result.current.resetFinancialData();
    });

    expect(api.fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/user-profile/reset-financial-data"),
      expect.objectContaining({
        method: "POST",
      }),
    );
    const [, init] = api.fetchMock.mock.calls.at(-1) ?? [];
    expect(JSON.parse(String(init?.body))).toEqual({ confirmation: "RESET" });
  });

  test("resetFinancialData reports a recent-login 403 as RecentLoginRequiredError", async () => {
    const { result } = renderProfileHook();
    api.answer({ kind: "forbidden" }, 403);
    await expect(result.current.resetFinancialData()).rejects.toBeInstanceOf(
      RecentLoginRequiredError,
    );
  });
});
