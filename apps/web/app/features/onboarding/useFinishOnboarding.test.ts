import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { deriveOnboardingSummary } from "./deriveOnboardingSummary";
import { INITIAL_VALUES, type OnboardingValues } from "./types";
import { FINISH_ERROR, PARTIAL_FINISH_ERROR, useFinishOnboarding } from "./useFinishOnboarding";

const { navigate, updateProfile, apiFetch, profileState } = vi.hoisted(() => ({
  navigate: vi.fn(),
  updateProfile: vi.fn(),
  apiFetch: vi.fn(),
  profileState: { current: { onboardingCompleted: false } as { onboardingCompleted: boolean } },
}));

vi.mock("react-router", () => ({ useNavigate: () => navigate }));
vi.mock("~/hooks/useUserProfile", () => ({
  useUserProfile: () => ({ updateProfile, profile: profileState.current }),
}));
vi.mock("~/services/api-client", () => ({
  apiFetch: (...args: unknown[]) => apiFetch(...args),
}));
vi.mock("./notify", () => ({ useOnboardingNotify: () => vi.fn() }));
vi.mock("@flump/finance-engine", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@flump/finance-engine")>()),
  clearOnboardingSeed: vi.fn(),
}));

const values: OnboardingValues = {
  ...INITIAL_VALUES,
  incomeMode: "net",
  monthlyTakeHome: 3000,
  taxRegion: "ENGLAND",
  cashSavings: 5000,
};

const setup = () => renderHook(() => useFinishOnboarding(values, deriveOnboardingSummary(values)));

/** Lookups return no existing rows; every POST rejects. */
const seedingFails = () =>
  apiFetch.mockImplementation((_endpoint: string, init?: { method?: string }) =>
    init?.method === "POST" ? Promise.reject(new Error("offline")) : Promise.resolve([]),
  );

describe("useFinishOnboarding", () => {
  beforeEach(() => {
    navigate.mockReset();
    updateProfile.mockReset();
    apiFetch.mockReset();
    profileState.current = { onboardingCompleted: false };
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("starts idle with nothing saved", () => {
    const { result } = setup();
    expect(result.current.saveState).toBe("idle");
    expect(result.current.profileSaved).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("reports nothing confirmed when the profile save fails", async () => {
    updateProfile.mockRejectedValue(new Error("offline"));
    const { result } = setup();
    await act(() => result.current.finish());
    expect(result.current.error).toBe(FINISH_ERROR);
    expect(result.current.profileSaved).toBe(false);
    expect(result.current.saveState).toBe("unconfirmed");
    expect(navigate).not.toHaveBeenCalled();
  });

  it("reports a partial save when the profile saved but seeding failed", async () => {
    updateProfile.mockResolvedValue(undefined);
    seedingFails();
    const { result } = setup();
    await act(() => result.current.finish());
    expect(result.current.error).toBe(PARTIAL_FINISH_ERROR);
    expect(result.current.profileSaved).toBe(true);
    expect(result.current.saveState).toBe("partial");
    // onboardingCompleted is never set after a failed seed.
    expect(updateProfile).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalled();
  });

  it("navigates home once everything is saved", async () => {
    updateProfile.mockResolvedValue(undefined);
    apiFetch.mockResolvedValue([]);
    const { result } = setup();
    await act(() => result.current.finish());
    expect(result.current.error).toBeNull();
    expect(updateProfile).toHaveBeenLastCalledWith({ onboardingCompleted: true });
    expect(navigate).toHaveBeenCalledWith("/");
  });

  it("saves net pay when salary sacrifice was never asked, the method the summary used", async () => {
    // Never asked in onboarding: the take-home in the summary (and the budget income row) is
    // worked out as net pay, so the profile must say so too rather than a salary-sacrifice default.
    updateProfile.mockResolvedValue(undefined);
    apiFetch.mockResolvedValue([]);
    const { result } = setup();
    await act(() => result.current.finish());
    expect(updateProfile.mock.calls[0]?.[0]).toMatchObject({ isSalarySacrifice: false });
  });

  it("leaves a saved salary-sacrifice choice alone when onboarding is run again", async () => {
    profileState.current = { onboardingCompleted: true };
    updateProfile.mockResolvedValue(undefined);
    apiFetch.mockResolvedValue([]);
    const { result } = setup();
    await act(() => result.current.finish());
    expect(updateProfile.mock.calls[0]?.[0]).not.toHaveProperty("isSalarySacrifice");
  });

  it("saves an answer given in onboarding even when run again", async () => {
    profileState.current = { onboardingCompleted: true };
    updateProfile.mockResolvedValue(undefined);
    apiFetch.mockResolvedValue([]);
    const answered: OnboardingValues = { ...values, isSalarySacrifice: true };
    const { result } = renderHook(() =>
      useFinishOnboarding(answered, deriveOnboardingSummary(answered)),
    );
    await act(() => result.current.finish());
    expect(updateProfile.mock.calls[0]?.[0]).toMatchObject({ isSalarySacrifice: true });
  });

  it("saves an owner's home estimate as a Property account, so net worth and LTV count it", async () => {
    updateProfile.mockResolvedValue(undefined);
    apiFetch.mockResolvedValue([]);
    const owner: OnboardingValues = {
      ...values,
      housingStatus: "mortgage",
      propertyValue: 310000,
      mortgageBalance: 186000,
    };
    const { result } = renderHook(() => useFinishOnboarding(owner, deriveOnboardingSummary(owner)));
    await act(() => result.current.finish());
    expect(apiFetch).toHaveBeenCalledWith("/accounts", {
      method: "POST",
      body: { name: "Home (your estimate)", type: "Property", balance: 310000, isCurrent: true },
    });
  });

  it("never seeds a second home when any Property account already exists (re-run)", async () => {
    updateProfile.mockResolvedValue(undefined);
    apiFetch.mockImplementation((endpoint: string, init?: { method?: string }) => {
      if (init?.method === "POST") return Promise.resolve({});
      return Promise.resolve(
        endpoint === "/accounts" ? [{ name: "Our house", type: "Property", balance: 400000 }] : [],
      );
    });
    const owner: OnboardingValues = {
      ...values,
      housingStatus: "mortgage",
      propertyValue: 310000,
      mortgageBalance: 186000,
    };
    const { result } = renderHook(() => useFinishOnboarding(owner, deriveOnboardingSummary(owner)));
    await act(() => result.current.finish());
    const posted = apiFetch.mock.calls
      .filter(([, init]) => (init as { method?: string } | undefined)?.method === "POST")
      .map(([, init]) => (init as { body: { type?: string } }).body);
    expect(posted.some((body) => body.type === "Property")).toBe(false);
    // The other baseline rows are still seeded.
    expect(posted.some((body) => body.type === "Mortgage")).toBe(true);
  });
});
