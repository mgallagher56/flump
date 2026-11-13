import { clearOnboardingSeed, persistOnboardingSeed } from "@flump/finance-engine";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import OnboardingRoute from "./app.onboarding";

const mockUpdateProfile = vi.fn().mockResolvedValue(undefined);
const mockNavigate = vi.fn();
const mockUpdateBaseline = vi.fn();

let mockActionData: unknown;
vi.mock("react-router", () => ({
  useActionData: () => mockActionData,
  useLoaderData: () => ({
    userProfile: {
      enabledPages: ["accounts", "budget", "savings", "pension"],
    },
    user: { name: "Alex" },
    accessToken: "mock-token",
  }),
  useNavigate: () => mockNavigate,
  Link: ({ children, to, className }: any) => (
    <a className={className} href={to}>
      {children}
    </a>
  ),
}));

vi.mock("~/hooks/useUserProfile", () => ({
  DEFAULT_PROFILE: {
    enabledPages: ["accounts", "budget", "savings", "pension", "mortgage", "tax"],
  },
  useUserProfile: () => ({
    updateProfile: mockUpdateProfile,
  }),
}));

vi.mock("~/state/baseline.store", () => ({
  useFinancialBaseline: () => ({
    baseline: {},
    updateBaseline: mockUpdateBaseline,
  }),
}));

const chooseRegion = (region = "ENGLAND") =>
  fireEvent.change(screen.getByLabelText(/where do you pay tax/i), { target: { value: region } });

// Lists (GET) answer with an empty array; creates (POST) answer with a record.
const okFetch = async (_url: string, init?: RequestInit) =>
  new Response(init?.method === "POST" ? JSON.stringify({ success: true }) : "[]", { status: 200 });
const posts = (fetchMock: ReturnType<typeof vi.fn>, suffix: string) =>
  fetchMock.mock.calls.filter(
    ([u, init]) => String(u).endsWith(suffix) && (init as RequestInit)?.method === "POST",
  );

describe("OnboardingRoute (3-Step Baseline Flow)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockActionData = undefined;
    vi.stubGlobal("ENV", { VITE_API_URL: "https://api.example.test" });
    globalThis.fetch = vi.fn().mockImplementation(okFetch);
  });

  it("shows a failed action's error in an alert", () => {
    mockActionData = { success: false, error: "We couldn't reach the server. Please try again." };
    render(<OnboardingRoute />);
    expect(screen.getByRole("alert").textContent).toBe(
      "We couldn't reach the server. Please try again.",
    );
  });

  it("shows no alert when there is no action error", () => {
    render(<OnboardingRoute />);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("renders Step 1 (You & Income) by default with summary bar", () => {
    render(<OnboardingRoute />);
    expect(screen.getByText("Step 1: You and income")).toBeDefined();
    expect(screen.getByLabelText(/current age/i)).toBeDefined();
    expect(screen.getByLabelText(/employment setup/i)).toBeDefined();
    expect(screen.getByText(/annual gross salary/i)).toBeDefined();
    expect(screen.getByText("Net take-home")).toBeDefined();
    expect(screen.getByText("Monthly surplus")).toBeDefined();
    expect(screen.getByText("Starting net worth")).toBeDefined();
  });

  it("advances from Step 1 to Step 2 and allows selecting housing status", () => {
    render(<OnboardingRoute />);

    const nextBtn = screen.getByText("Next: Housing and outgoings →");
    fireEvent.click(nextBtn);

    expect(screen.getByText("Step 2: Housing and monthly outgoings")).toBeDefined();
    expect(screen.getByText(/housing status/i)).toBeDefined();
    expect(screen.getByText(/rent payment|monthly rent/i)).toBeDefined();

    // Select mortgage
    fireEvent.click(screen.getByText(/🏡 mortgage/i));
    expect(screen.getByText(/property value/i)).toBeDefined();
    expect(screen.getByText(/mortgage balance/i)).toBeDefined();
  });

  it("advances from Step 2 to Step 3 and finishes setup to launch dashboard", async () => {
    render(<OnboardingRoute />);
    fireEvent.change(screen.getByLabelText(/annual gross salary/i), { target: { value: "45000" } });
    chooseRegion();

    // Step 1 -> Step 2
    fireEvent.click(screen.getByText("Next: Housing and outgoings →"));
    // Step 2 -> Step 3
    fireEvent.click(screen.getByText("Next: Savings, pension and debt →"));

    expect(screen.getByText("Step 3: Savings, pension and debt")).toBeDefined();
    expect(screen.getByLabelText(/total cash and isa savings/i)).toBeDefined();
    expect(screen.getByLabelText(/current pension pot/i)).toBeDefined();
    expect(screen.getByLabelText(/total credit cards and personal loans/i)).toBeDefined();

    const finishBtn = screen.getByRole("button", { name: /finish setup and launch dashboard/i });
    fireEvent.click(finishBtn);

    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          enabledPages: expect.any(Array),
        }),
      );
      expect(mockUpdateProfile).toHaveBeenLastCalledWith({ onboardingCompleted: true });
      // D31: the server profile is the only store; onboarding writes no client baseline.
      expect(mockUpdateBaseline).not.toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });
  });

  it("allows navigating back between steps", () => {
    render(<OnboardingRoute />);

    // Step 1 -> Step 2
    fireEvent.click(screen.getByText("Next: Housing and outgoings →"));
    expect(screen.getByText("Step 2: Housing and monthly outgoings")).toBeDefined();

    // Step 2 -> Back to Step 1
    fireEvent.click(screen.getByRole("button", { name: /back/i }));
    expect(screen.getByText("Step 1: You and income")).toBeDefined();
  });

  it("hydrates pre-loaded seed from tools and allows 10s fast-track launch", async () => {
    const seed = {
      annualIncome: 75000,
      pensionContributionPct: 7,
      initialCashSavings: 18000,
      initialInvestments: 25000,
      inferredModules: ["accounts", "budget", "pension", "savings"] as const,
      timestamp: Date.now(),
    };
    persistOnboardingSeed(seed as any);

    render(<OnboardingRoute />);

    expect(screen.getByText(/we've pre-loaded your £75,000 salary/i)).toBeDefined();
    chooseRegion("SCOTLAND");
    const quickLaunchBtn = screen.getByText(/launch dashboard with this baseline \(10s\) →/i);
    fireEvent.click(quickLaunchBtn);

    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });

    clearOnboardingSeed();
  });

  it("reads a salary-less demo seed: remembers choices, leaves salary empty, Finish disabled", () => {
    persistOnboardingSeed({
      mode: "WEALTH",
      inferredStage: "STAGE_2_BUFFER_BUILD",
      inferredModules: ["accounts", "budget"],
      timestamp: Date.now(),
    } as any);
    render(<OnboardingRoute />);
    expect(screen.getByText(/your demo choices are remembered/i)).toBeDefined();
    expect((screen.getByLabelText(/annual gross salary/i) as HTMLInputElement).value).toBe("");
    fireEvent.click(screen.getByText("Next: Housing and outgoings →"));
    fireEvent.click(screen.getByText("Next: Savings, pension and debt →"));
    const finishBtn = screen.getByRole("button", { name: /finish setup and launch dashboard/i });
    expect((finishBtn as HTMLButtonElement).disabled).toBe(true);
    const hint = screen.getByTestId("finish-income-hint");
    expect(hint.getAttribute("role")).toBe("status");
    expect(finishBtn.getAttribute("aria-describedby")).toBe(hint.id);
    clearOnboardingSeed();
  });

  it("seed banner launch button explains why it is disabled until income is entered", () => {
    persistOnboardingSeed({ initialCashSavings: 2000, timestamp: Date.now() } as any);
    render(<OnboardingRoute />);
    const btn = screen.getByRole("button", { name: /launch dashboard with this baseline/i });
    expect((btn as HTMLButtonElement).disabled).toBe(true);
    const hint = screen.getByTestId("seed-income-hint");
    expect(btn.getAttribute("aria-describedby")).toBe(hint.id);
    clearOnboardingSeed();
  });

  it("net-income mode enables Finish once monthly take-home is entered", () => {
    render(<OnboardingRoute />);
    fireEvent.click(screen.getByRole("button", { name: /monthly net/i }));
    typeInto(/monthly net|take-home/i, "3000");
    chooseRegion("WALES");
    fireEvent.click(screen.getByText("Next: Housing and outgoings →"));
    fireEvent.click(screen.getByText("Next: Savings, pension and debt →"));
    const finishBtn = screen.getByRole("button", { name: /finish setup and launch dashboard/i });
    expect((finishBtn as HTMLButtonElement).disabled).toBe(false);
    expect(screen.queryByTestId("finish-income-hint")).toBeNull();
  });

  it("leaves birth year unset for a fractional or out-of-range age instead of failing the save", async () => {
    render(<OnboardingRoute />);
    typeInto(/annual gross salary/i, "45000");
    chooseRegion();
    typeInto(/current age/i, "32.5");
    fireEvent.click(screen.getByText("Next: Housing and outgoings →"));
    fireEvent.click(screen.getByText("Next: Savings, pension and debt →"));
    fireEvent.click(screen.getByRole("button", { name: /finish setup and launch dashboard/i }));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/"));
    expect(mockUpdateProfile.mock.calls[0][0].birthYear).toBeUndefined();
  });

  it("keeps Finish disabled until a tax region is chosen (D-4-C) and says why", () => {
    render(<OnboardingRoute />);
    typeInto(/annual gross salary/i, "45000");
    fireEvent.click(screen.getByText("Next: Housing and outgoings →"));
    fireEvent.click(screen.getByText("Next: Savings, pension and debt →"));
    const finishBtn = () =>
      screen.getByRole("button", {
        name: /finish setup and launch dashboard/i,
      }) as HTMLButtonElement;
    expect(finishBtn().disabled).toBe(true);
    expect(screen.getByTestId("finish-income-hint").textContent).toMatch(/where you pay tax/i);
    fireEvent.click(screen.getByRole("button", { name: /back/i }));
    fireEvent.click(screen.getByRole("button", { name: /back/i }));
    chooseRegion("NORTHERN_IRELAND");
    fireEvent.click(screen.getByText("Next: Housing and outgoings →"));
    fireEvent.click(screen.getByText("Next: Savings, pension and debt →"));
    expect(finishBtn().disabled).toBe(false);
  });

  it("uses Scottish income-tax bands for the live take-home when Scotland is chosen (D06)", () => {
    render(<OnboardingRoute />);
    typeInto(/annual gross salary/i, "50000");
    expect(screen.getByTestId("onboarding-take-home-assumption").textContent).toMatch(
      /assuming england, wales and northern ireland/i,
    );
    chooseRegion("ENGLAND");
    expect(screen.queryByTestId("onboarding-take-home-assumption")).toBeNull();
    const england = screen.getByTestId("onboarding-take-home").textContent;
    chooseRegion("SCOTLAND");
    const scotland = screen.getByTestId("onboarding-take-home").textContent;
    expect(england).not.toBe(scotland);
  });

  const typeInto = (label: RegExp, value: string) =>
    fireEvent.change(screen.getByLabelText(label), { target: { value } });

  const finish = (opts: { cash?: string; pot?: string } = { cash: "5000", pot: "15000" }) => {
    render(<OnboardingRoute />);
    typeInto(/annual gross salary/i, "45000");
    chooseRegion();
    fireEvent.click(screen.getByText("Next: Housing and outgoings →"));
    fireEvent.click(screen.getByText("Next: Savings, pension and debt →"));
    if (opts.cash) typeInto(/total cash and isa savings/i, opts.cash);
    if (opts.pot) typeInto(/current pension pot/i, opts.pot);
    fireEvent.click(screen.getByRole("button", { name: /finish setup and launch dashboard/i }));
  };

  it("shows an alert and does not navigate when saving the profile fails", async () => {
    mockUpdateProfile.mockRejectedValueOnce(new Error("503"));
    finish();
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/couldn.t save your details/i);
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("shows an alert and does not navigate when seeding fails, and a retry can then succeed", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 503 }));
    globalThis.fetch = fetchMock as any;
    finish();
    expect((await screen.findByRole("alert")).textContent).toMatch(/couldn.t save your details/i);
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockUpdateProfile).not.toHaveBeenCalledWith({ onboardingCompleted: true });
    expect(mockUpdateProfile).not.toHaveBeenCalledWith(
      expect.objectContaining({ onboardingCompleted: true }),
    );

    fetchMock.mockImplementation(okFetch);
    fireEvent.click(screen.getByRole("button", { name: /finish setup and launch dashboard/i }));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/"));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("retries only failed seed jobs after a partial success", async () => {
    let entriesOk = false;
    const fetchMock = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/budget-entries") && init?.method === "POST" && !entriesOk) {
        return new Response(null, { status: 503 });
      }
      return okFetch(url, init);
    });
    globalThis.fetch = fetchMock as any;
    finish();
    await screen.findByRole("alert");
    expect(mockNavigate).not.toHaveBeenCalled();
    const accountCalls = () => posts(fetchMock, "/accounts").length;
    const accountsFirst = accountCalls();
    expect(accountsFirst).toBeGreaterThan(0);

    entriesOk = true;
    fireEvent.click(screen.getByRole("button", { name: /finish setup and launch dashboard/i }));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/"));
    expect(accountCalls()).toBe(accountsFirst);
    expect(mockUpdateProfile).toHaveBeenLastCalledWith({ onboardingCompleted: true });
  });

  it("skips accounts and budget entries that already exist on the backend", async () => {
    const fetchMock = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      if (init?.method === "POST") return okFetch(url, init);
      if (String(url).endsWith("/accounts")) {
        return new Response(
          JSON.stringify([{ name: "Cash and emergency savings" }, { name: "Unrelated" }]),
          { status: 200 },
        );
      }
      return new Response(JSON.stringify([{ name: "Monthly Take-Home Income" }]), { status: 200 });
    });
    globalThis.fetch = fetchMock as any;
    finish();
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/"));
    const created = (suffix: string) =>
      posts(fetchMock, suffix).map(([, init]) => JSON.parse((init as RequestInit).body as string));
    expect(created("/accounts").map((a) => a.name)).not.toContain("Cash and emergency savings");
    expect(created("/budget-entries").map((e) => e.name)).not.toContain("Monthly Take-Home Income");
  });

  it("creates everything when nothing exists yet", async () => {
    const fetchMock = vi.fn().mockImplementation(okFetch);
    globalThis.fetch = fetchMock as any;
    finish();
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/"));
    const names = posts(fetchMock, "/accounts").map(
      ([, init]) => JSON.parse((init as RequestInit).body as string).name,
    );
    expect(names).toContain("Cash and emergency savings");
  });

  it("does not seed or complete onboarding when the existing-records lookup fails", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(async (url: string, init?: RequestInit) =>
        init?.method === "POST" ? okFetch(url, init) : new Response(null, { status: 503 }),
      );
    globalThis.fetch = fetchMock as any;
    finish();
    expect((await screen.findByRole("alert")).textContent).toMatch(/couldn.t save your details/i);
    expect(posts(fetchMock, "/accounts")).toHaveLength(0);
    expect(posts(fetchMock, "/budget-entries")).toHaveLength(0);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("treats a non-array lookup response as a failure instead of guessing", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(async (url: string, init?: RequestInit) =>
        init?.method === "POST" ? okFetch(url, init) : new Response("{}", { status: 200 }),
      );
    globalThis.fetch = fetchMock as any;
    finish();
    await screen.findByRole("alert");
    expect(posts(fetchMock, "/accounts")).toHaveLength(0);
  });

  it("starts with every numeric field empty and shows examples as placeholders", () => {
    render(<OnboardingRoute />);
    const age = screen.getByLabelText(/current age/i) as HTMLInputElement;
    const salary = screen.getByLabelText(/annual gross salary/i) as HTMLInputElement;
    expect(age.value).toBe("");
    expect(salary.value).toBe("");
    expect(age.placeholder).toMatch(/e\.g\./i);
    expect(salary.placeholder).toMatch(/e\.g\./i);
    fireEvent.click(screen.getByText("Next: Housing and outgoings →"));
    expect((screen.getByLabelText(/monthly rent/i) as HTMLInputElement).value).toBe("");
    fireEvent.click(screen.getByText("Next: Savings, pension and debt →"));
    for (const label of [/total cash and isa savings/i, /current pension pot/i, /contribution/i]) {
      const input = screen.getByLabelText(label) as HTMLInputElement;
      expect(input.value).toBe("");
      expect(input.placeholder).toMatch(/e\.g\./i);
    }
  });

  it("keeps Finish disabled until income is entered", () => {
    render(<OnboardingRoute />);
    fireEvent.click(screen.getByText("Next: Housing and outgoings →"));
    fireEvent.click(screen.getByText("Next: Savings, pension and debt →"));
    const finishBtn = screen.getByRole("button", { name: /finish setup and launch dashboard/i });
    expect((finishBtn as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: /back/i }));
    fireEvent.click(screen.getByRole("button", { name: /back/i }));
    typeInto(/annual gross salary/i, "45000");
    chooseRegion();
    fireEvent.click(screen.getByText("Next: Housing and outgoings →"));
    fireEvent.click(screen.getByText("Next: Savings, pension and debt →"));
    expect(
      (
        screen.getByRole("button", {
          name: /finish setup and launch dashboard/i,
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false);
  });

  it("creates no cash or pension accounts when those fields are left empty", async () => {
    const fetchMock = vi.fn().mockImplementation(okFetch);
    globalThis.fetch = fetchMock as any;
    finish({});
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/"));
    expect(posts(fetchMock, "/accounts")).toHaveLength(0);
    const profile = mockUpdateProfile.mock.calls[0][0];
    expect(profile.pensionPercent).toBeUndefined();
    expect(profile.birthYear).toBeUndefined();
  });

  // Consumer half of the web-to-backend contract pair (E23 P0-3). These literals are duplicated in
  // apps/backend/test/contract/web-payloads.ts (web cannot import it: its tsconfig project does not
  // include backend files), which the backend replays against a real Postgres-backed app. Keep the
  // two in sync by hand until shared zod schemas land in E21.
  it("sends the exact onboarding payloads the backend contract test replays", async () => {
    const fetchMock = vi.fn().mockImplementation(okFetch);
    globalThis.fetch = fetchMock as any;
    render(<OnboardingRoute />);
    typeInto(/annual gross salary/i, "45000");
    chooseRegion("SCOTLAND");
    typeInto(/current age/i, "32");
    fireEvent.change(screen.getByLabelText(/student loan plan/i), { target: { value: "PLAN_2" } });
    fireEvent.click(screen.getByText("Next: Housing and outgoings →"));
    fireEvent.click(screen.getByRole("button", { name: /mortgage/i }));
    typeInto(/monthly mortgage payment/i, "900");
    typeInto(/property value/i, "300000");
    typeInto(/mortgage balance/i, "200000");
    typeInto(/other monthly outgoings/i, "700");
    fireEvent.click(screen.getByText("Next: Savings, pension and debt →"));
    typeInto(/total cash and isa savings/i, "5000");
    typeInto(/current pension pot/i, "15000");
    typeInto(/contribution \(%\)/i, "5");
    typeInto(/unsecured debt/i, "2000");
    fireEvent.click(screen.getByRole("button", { name: /finish setup and launch dashboard/i }));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/"));

    const body = (suffix: string) =>
      posts(fetchMock, suffix).map(([, init]) => JSON.parse((init as RequestInit).body as string));
    expect(body("/accounts")).toEqual([
      { name: "Cash and emergency savings", type: "Saving", balance: 5000, isCurrent: true },
      { name: "Workplace and personal pension", type: "Pension", balance: 15000, isCurrent: true },
      { name: "Residential Mortgage", type: "Mortgage", balance: 200000, isCurrent: true },
      { name: "Cards and loans baseline", type: "Credit Card", balance: 2000, isCurrent: true },
    ]);
    expect(body("/budget-entries")).toEqual([
      {
        name: "Monthly Take-Home Income",
        category: "income",
        amount: 2718,
        isIncome: true,
        frequency: "monthly",
      },
      {
        name: "Mortgage Payment",
        category: "housing",
        amount: 900,
        isIncome: false,
        frequency: "monthly",
      },
      {
        name: "General living and outgoings",
        category: "living",
        amount: 700,
        isIncome: false,
        frequency: "monthly",
      },
    ]);
    // JSON round trip: undefined fields are dropped on the wire, exactly as the backend sees them.
    expect(JSON.parse(JSON.stringify(mockUpdateProfile.mock.calls[0][0]))).toEqual({
      birthYear: new Date().getFullYear() - 32,
      annualSalary: 45000,
      monthlyTakeHome: 2718,
      employmentType: "employed",
      taxRegion: "SCOTLAND",
      studentLoanPlans: ["PLAN_2"],
      housingStatus: "mortgage",
      monthlyHousingCost: 900,
      monthlyOtherOutgoings: 700,
      hasMortgage: true,
      homeValue: 300000,
      pensionPercent: 5,
      enabledPages: ["accounts", "budget", "savings", "debt", "pension", "mortgage"],
      dashboardWidgets: ["accounts", "budget", "savings", "debt", "pension", "mortgage"],
      dashboardWidgetOrder: ["accounts", "budget", "savings", "debt", "pension", "mortgage"],
    });
    expect(mockUpdateProfile).toHaveBeenLastCalledWith({ onboardingCompleted: true });
  });
});
