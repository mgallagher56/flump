import { CreateAccountResponse } from "@flump/api-contract";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { deriveOnboardingSummary } from "./deriveOnboardingSummary";
import { INITIAL_VALUES, type OnboardingValues } from "./types";
import {
  FINISH_ERROR,
  MORTGAGE_WITH_PROPERTY_ACTION,
  onboardingProfileUpdate,
  PARTIAL_FINISH_ERROR,
  useFinishOnboarding,
} from "./useFinishOnboarding";

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
// One mock for both: the existing-row lookups go through apiFetchAll.
vi.mock("~/services/api-client", () => ({
  apiFetch: (...args: unknown[]) => apiFetch(...args),
  apiFetchAll: (...args: unknown[]) => apiFetch(...args),
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
    expect(updateProfile).toHaveBeenLastCalledWith(
      { onboardingCompleted: true },
      { reload: false },
    );
    expect(navigate).toHaveBeenCalledWith("/");
  });

  it("opens the budget page's wizard for common items when asked, with no money in the URL", async () => {
    updateProfile.mockResolvedValue(undefined);
    apiFetch.mockResolvedValue([]);
    const { result } = setup();
    await act(() => result.current.finish("budget"));
    expect(result.current.error).toBeNull();
    expect(updateProfile).toHaveBeenLastCalledWith(
      { onboardingCompleted: true },
      { reload: false },
    );
    expect(navigate).toHaveBeenCalledWith("/app/budget?setup=common");
  });

  it("does not leave onboarding for the budget page when seeding fails", async () => {
    updateProfile.mockResolvedValue(undefined);
    seedingFails();
    const { result } = setup();
    await act(() => result.current.finish("budget"));
    expect(result.current.error).toBe(PARTIAL_FINISH_ERROR);
    expect(navigate).not.toHaveBeenCalled();
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

  it("saves an outright owner's home estimate as a Property account, so net worth counts it", async () => {
    updateProfile.mockResolvedValue(undefined);
    apiFetch.mockResolvedValue([]);
    const owner: OnboardingValues = {
      ...values,
      housingStatus: "own_outright",
      propertyValue: 310000,
    };
    const { result } = renderHook(() => useFinishOnboarding(owner, deriveOnboardingSummary(owner)));
    await act(() => result.current.finish());
    expect(apiFetch).toHaveBeenCalledWith("/accounts", {
      method: "POST",
      body: {
        name: "Home (your estimate)",
        type: "Property",
        accountSubtype: "home",
        balance: 310000,
        isCurrent: true,
      },
      schema: CreateAccountResponse,
    });
  });

  it("saves a mortgage and its home with one linked call through the route action (slice 4)", async () => {
    updateProfile.mockResolvedValue(undefined);
    apiFetch.mockResolvedValue([]);
    const pairFetch = vi.fn().mockResolvedValue(new Response("{}", { status: 201 }));
    vi.stubGlobal("fetch", pairFetch);
    try {
      const owner: OnboardingValues = {
        ...values,
        housingStatus: "mortgage",
        propertyValue: 310000,
        mortgageBalance: 186000,
      };
      const { result } = renderHook(() =>
        useFinishOnboarding(owner, deriveOnboardingSummary(owner)),
      );
      await act(() => result.current.finish());
      expect(pairFetch).toHaveBeenCalledTimes(1);
      const [url, init] = pairFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(MORTGAGE_WITH_PROPERTY_ACTION);
      expect(init.method).toBe("POST");
      expect(JSON.parse(String(init.body))).toEqual({
        key: expect.any(String),
        payload: {
          mortgage: {
            name: "Residential Mortgage",
            accountSubtype: "residential_mortgage",
            balance: 186000,
            isCurrent: true,
          },
          property: { name: "Home (your estimate)", balance: 310000 },
        },
      });
      // Neither half goes through the browser's /api proxy on its own.
      const accountPosts = apiFetch.mock.calls
        .filter(
          ([endpoint, init]) =>
            endpoint === "/accounts" &&
            (init as { method?: string } | undefined)?.method === "POST",
        )
        .map(([, init]) => (init as { body: { type?: string } }).body.type);
      expect(accountPosts).not.toContain("Mortgage");
      expect(accountPosts).not.toContain("Property");
      expect(
        apiFetch.mock.calls.some(([endpoint]) => endpoint === "/accounts/mortgage-with-property"),
      ).toBe(false);
      expect(result.current.error).toBeNull();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("stays on the page with an error when the route action refuses the pair", async () => {
    updateProfile.mockResolvedValue(undefined);
    apiFetch.mockResolvedValue([]);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 400 })));
    try {
      const owner: OnboardingValues = {
        ...values,
        housingStatus: "mortgage",
        propertyValue: 310000,
        mortgageBalance: 186000,
      };
      const { result } = renderHook(() =>
        useFinishOnboarding(owner, deriveOnboardingSummary(owner)),
      );
      await act(() => result.current.finish());
      expect(result.current.error).toBe(PARTIAL_FINISH_ERROR);
      expect(updateProfile).not.toHaveBeenCalledWith({ onboardingCompleted: true });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("adds only the missing home when a retry finds the mortgage saved", async () => {
    updateProfile.mockResolvedValue(undefined);
    apiFetch.mockImplementation((endpoint: string, init?: { method?: string }) => {
      if (init?.method === "POST") return Promise.resolve({});
      return Promise.resolve(
        endpoint === "/accounts"
          ? [{ name: "Residential Mortgage", type: "Mortgage", balance: -186000 }]
          : [],
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
    expect(apiFetch).toHaveBeenCalledWith("/accounts", {
      method: "POST",
      body: {
        name: "Home (your estimate)",
        balance: 310000,
        type: "Property",
        accountSubtype: "home",
        isCurrent: true,
      },
      schema: CreateAccountResponse,
    });
    expect(
      apiFetch.mock.calls.some(([endpoint]) => endpoint === "/accounts/mortgage-with-property"),
    ).toBe(false);
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

describe("onboarding take-home equals the Dashboard's after finishing", () => {
  // The Dashboard reads selectTakeHome over the saved profile; the saved profile is built from
  // exactly what Finish sends. Rates are pinned to 2026/27.
  const dashboardMonthly = async (vals: OnboardingValues): Promise<number | null> => {
    const { profileFactsFromProfile, selectTakeHome } = await import("@flump/finance-engine");
    const summary = deriveOnboardingSummary(vals);
    const saved = onboardingProfileUpdate(vals, summary, { firstRun: true });
    const figure = selectTakeHome(profileFactsFromProfile(saved as Record<string, unknown>));
    return figure.status === "known" ? figure.value.monthly : null;
  };

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-19T12:00:00Z"));
    return () => vi.useRealTimers();
  });

  it("salary mode, £30,000 at 5% in England: £1,993 a month on both", async () => {
    const gross: OnboardingValues = {
      ...INITIAL_VALUES,
      incomeMode: "gross",
      grossSalary: 30000,
      employmentType: "employed",
      taxRegion: "ENGLAND",
      pensionPercent: 5,
    };
    // 2026/27, England, net pay: pension 30,000 x 5% = 1,500; tax (30,000 - 1,500 - 12,570) x 20%
    // = 3,186; NI (30,000 - 12,570) x 8% = 1,394.40; 30,000 - 1,500 - 3,186 - 1,394.40 =
    // 23,919.60 a year; / 12 = 1,993.30, so £1,993 a month.
    expect(deriveOnboardingSummary(gross).monthlyTakeHome).toBe(1993);
    expect(await dashboardMonthly(gross)).toBe(1993);
    const saved = onboardingProfileUpdate(gross, deriveOnboardingSummary(gross), {
      firstRun: true,
    });
    expect(saved.annualSalary).toBe(30000);
    // Not a typed figure: the engine works it out from the salary.
    expect(saved.monthlyTakeHome).toBeNull();
    expect(saved.pensionPercent).toBe(5);
  });

  it("take-home mode, £2,500 typed: £2,500 a month on both, with no salary saved", async () => {
    const net: OnboardingValues = {
      ...INITIAL_VALUES,
      incomeMode: "net",
      monthlyTakeHome: 2500,
      taxRegion: "ENGLAND",
    };
    expect(deriveOnboardingSummary(net).monthlyTakeHome).toBe(2500);
    expect(await dashboardMonthly(net)).toBe(2500);
    const saved = onboardingProfileUpdate(net, deriveOnboardingSummary(net), { firstRun: true });
    // Typed net pay is never turned into a salary (2,500 x 12 is not pay before tax).
    expect(saved.annualSalary).toBeNull();
    expect(saved.monthlyTakeHome).toBe(2500);
  });

  it("never saves a blank pension, not as 0 and not presumed", () => {
    const blank: OnboardingValues = {
      ...INITIAL_VALUES,
      incomeMode: "gross",
      grossSalary: 30000,
      taxRegion: "ENGLAND",
    };
    const saved = onboardingProfileUpdate(blank, deriveOnboardingSummary(blank), {
      firstRun: true,
    });
    expect(saved).not.toHaveProperty("pensionPercent");
    expect(saved).not.toHaveProperty("pensionEmployerPercent");
    // A typed 0 is an answer and is saved.
    const none = onboardingProfileUpdate(
      { ...blank, pensionPercent: 0 },
      deriveOnboardingSummary(blank),
      { firstRun: true },
    );
    expect(none.pensionPercent).toBe(0);
  });
});
