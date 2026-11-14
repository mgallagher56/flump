import { clearOnboardingSeed, persistOnboardingSeed } from "@flump/finance-engine";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import OnboardingRoute from "./app.onboarding";

const mockUpdateProfile = vi.fn().mockResolvedValue(undefined);
const mockNavigate = vi.fn();
const mockUpdateBaseline = vi.fn();
const mockNotify = vi.fn();

let mockActionData: unknown;
vi.mock("react-router", () => ({
  useActionData: () => mockActionData,
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

vi.mock("~/features/onboarding/notify", () => ({
  useOnboardingNotify: () => mockNotify,
}));

vi.mock("~/state/baseline.store", () => ({
  useFinancialBaseline: () => ({
    baseline: {},
    updateBaseline: mockUpdateBaseline,
  }),
}));

const typeInto = (label: RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
const chooseRegion = (region = "ENGLAND") =>
  fireEvent.change(screen.getByLabelText(/where do you pay tax/i), { target: { value: region } });
const next = () => fireEvent.click(screen.getByRole("button", { name: /^next/i }));
const skip = () => fireEvent.click(screen.getByRole("button", { name: "Skip for now" }));
const back = () => fireEvent.click(screen.getByRole("button", { name: "Back" }));
const stepHeading = (name: string | RegExp) => screen.getByRole("heading", { level: 2, name });
/** Income -> Housing -> Savings -> Bank -> Review. Skipping the bank step is the usual path. */
const goToReview = () => {
  next();
  next();
  next();
  skip();
};
const finishButton = () =>
  screen.getByRole("button", { name: /finish and open dashboard/i }) as HTMLButtonElement;
const clickFinish = () => fireEvent.click(finishButton());

// Lists (GET) answer with an empty array; creates (POST) answer with a record.
const okFetch = async (_url: string, init?: RequestInit) =>
  new Response(init?.method === "POST" ? JSON.stringify({ success: true }) : "[]", { status: 200 });
const posts = (fetchMock: ReturnType<typeof vi.fn>, suffix: string) =>
  fetchMock.mock.calls.filter(
    ([u, init]) => String(u).endsWith(suffix) && (init as RequestInit)?.method === "POST",
  );

describe("OnboardingRoute (5-step flow)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearOnboardingSeed();
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

  it("renders the income step by default with the stepper and live summary", () => {
    render(<OnboardingRoute />);
    expect(stepHeading("You and income")).toBeDefined();
    expect(screen.getByRole("list", { name: /setup progress/i })).toBeDefined();
    expect(screen.getByLabelText(/current age/i)).toBeDefined();
    expect(screen.getByLabelText(/annual gross salary/i)).toBeDefined();
    expect(screen.getByRole("radio", { name: /self-employed/i })).toBeDefined();
    expect(screen.getByText("Net take-home")).toBeDefined();
    expect(screen.getByText("Monthly surplus")).toBeDefined();
    expect(screen.getByText("Starting net worth")).toBeDefined();
  });

  it("does not claim a setup time", () => {
    const { container } = render(<OnboardingRoute />);
    expect(container.textContent).not.toMatch(/\d+\s*seconds/i);
  });

  it("offers typical salary presets without the £105,000 band", () => {
    render(<OnboardingRoute />);
    const presets = screen.getByRole("group", { name: /typical salaries/i });
    expect(presets.textContent).toContain("£32,000");
    expect(presets.textContent).toContain("£45,000");
    expect(presets.textContent).toContain("£65,000");
    expect(presets.textContent).not.toContain("105,000");
    fireEvent.click(screen.getByRole("button", { name: "£45,000" }));
    expect((screen.getByLabelText(/annual gross salary/i) as HTMLInputElement).value).toBe(
      "45,000",
    );
  });

  it("advances to housing and shows mortgage fields when Mortgage is chosen", () => {
    render(<OnboardingRoute />);
    next();
    expect(stepHeading(/housing/i)).toBeDefined();
    expect(screen.getByRole("group", { name: /housing status/i })).toBeDefined();
    expect(screen.getByLabelText(/monthly rent/i)).toBeDefined();
    expect(screen.queryByLabelText(/property value/i)).toBeNull();

    fireEvent.click(screen.getByRole("radio", { name: /mortgage/i }));
    expect(screen.getByLabelText(/monthly mortgage payment/i)).toBeDefined();
    expect(screen.getByLabelText(/property value/i)).toBeDefined();
    expect(screen.getByLabelText(/mortgage balance/i)).toBeDefined();
  });

  it("walks through all five steps and finishes", async () => {
    render(<OnboardingRoute />);
    typeInto(/annual gross salary/i, "45000");
    chooseRegion();
    next();
    next();
    expect(stepHeading("Savings and debt")).toBeDefined();
    expect(screen.getByLabelText(/total cash and isa savings/i)).toBeDefined();
    expect(screen.getByLabelText(/current pension pot/i)).toBeDefined();
    expect(screen.getByLabelText(/credit cards and personal loans/i)).toBeDefined();
    next();
    expect(stepHeading("Bank connection")).toBeDefined();
    skip();
    expect(stepHeading(/review what will be saved/i)).toBeDefined();
    clickFinish();

    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith(
        expect.objectContaining({ enabledPages: expect.any(Array) }),
      );
      expect(mockUpdateProfile).toHaveBeenLastCalledWith({ onboardingCompleted: true });
      // D31: the server profile is the only store; onboarding writes no client baseline.
      expect(mockUpdateBaseline).not.toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });
    expect(mockNotify).toHaveBeenCalledWith("Your details are saved");
  });

  it("allows navigating back between steps and jumping to a step", () => {
    render(<OnboardingRoute />);
    next();
    expect(stepHeading(/housing/i)).toBeDefined();
    back();
    expect(stepHeading("You and income")).toBeDefined();
    fireEvent.click(
      within(screen.getByRole("navigation", { name: /go to a step/i })).getByRole("button", {
        name: /savings and debt/i,
      }),
    );
    expect(stepHeading("Savings and debt")).toBeDefined();
  });

  it("hydrates a pre-loaded seed from tools and allows launching with it", async () => {
    persistOnboardingSeed({
      annualIncome: 75000,
      pensionContributionPct: 7,
      initialCashSavings: 18000,
      initialInvestments: 25000,
      inferredModules: ["accounts", "budget", "pension", "savings"],
      timestamp: Date.now(),
    } as any);

    render(<OnboardingRoute />);

    expect(screen.getByTestId("seed-banner").textContent).toMatch(
      /we've pre-loaded your £75,000 salary/i,
    );
    chooseRegion("SCOTLAND");
    fireEvent.click(screen.getByRole("button", { name: /finish with these numbers/i }));

    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });
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
    goToReview();
    expect(finishButton().disabled).toBe(true);
    const hint = screen.getByTestId("finish-income-hint");
    expect(hint.getAttribute("role")).toBe("status");
    expect(finishButton().getAttribute("aria-describedby")).toBe(hint.id);
  });

  it("seed banner launch button explains why it is disabled until income is entered", () => {
    persistOnboardingSeed({ initialCashSavings: 2000, timestamp: Date.now() } as any);
    render(<OnboardingRoute />);
    const btn = screen.getByRole("button", { name: /finish with these numbers/i });
    expect((btn as HTMLButtonElement).disabled).toBe(true);
    const hint = screen.getByTestId("seed-income-hint");
    expect(btn.getAttribute("aria-describedby")).toBe(hint.id);
  });

  it("net-income mode enables Finish once monthly take-home is entered", () => {
    render(<OnboardingRoute />);
    fireEvent.click(screen.getByRole("radio", { name: /take-home after tax/i }));
    typeInto(/monthly take-home pay/i, "3000");
    chooseRegion("WALES");
    goToReview();
    expect(finishButton().disabled).toBe(false);
    expect(screen.queryByTestId("finish-income-hint")).toBeNull();
  });

  it("leaves birth year unset for a fractional or out-of-range age instead of failing the save", async () => {
    render(<OnboardingRoute />);
    typeInto(/annual gross salary/i, "45000");
    chooseRegion();
    typeInto(/current age/i, "32.5");
    goToReview();
    clickFinish();
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/"));
    expect(mockUpdateProfile.mock.calls[0][0].birthYear).toBeUndefined();
  });

  it("keeps Finish disabled until a tax region is chosen (D-4-C) and says why", () => {
    render(<OnboardingRoute />);
    typeInto(/annual gross salary/i, "45000");
    goToReview();
    expect(finishButton().disabled).toBe(true);
    expect(screen.getByTestId("finish-income-hint").textContent).toMatch(/where you pay tax/i);
    fireEvent.click(screen.getByRole("button", { name: "Edit You and income" }));
    chooseRegion("NORTHERN_IRELAND");
    goToReview();
    expect(finishButton().disabled).toBe(false);
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
    expect(screen.getByTestId("onboarding-take-home").getAttribute("data-figure")).toBe(
      "takeHome.monthly",
    );
  });

  it("shows Not set rather than £0 before any income is entered", () => {
    render(<OnboardingRoute />);
    expect(screen.getByTestId("onboarding-take-home").textContent).toBe("Not set");
    expect(screen.getByTestId("onboarding-net-worth").textContent).toBe("Not set");
  });

  const fillAndFinish = (
    opts: { cash?: string; pot?: string } = { cash: "5000", pot: "15000" },
  ) => {
    render(<OnboardingRoute />);
    typeInto(/annual gross salary/i, "45000");
    chooseRegion();
    next();
    next();
    if (opts.cash) typeInto(/total cash and isa savings/i, opts.cash);
    if (opts.pot) typeInto(/current pension pot/i, opts.pot);
    next();
    skip();
    clickFinish();
  };

  it("shows an alert and does not navigate when saving the profile fails", async () => {
    mockUpdateProfile.mockRejectedValueOnce(new Error("503"));
    fillAndFinish();
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/couldn.t save your details/i);
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockNotify).not.toHaveBeenCalled();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("shows an alert and does not navigate when seeding fails, and a retry can then succeed", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 503 }));
    globalThis.fetch = fetchMock as any;
    fillAndFinish();
    expect((await screen.findByRole("alert")).textContent).toMatch(/saved some of your details/i);
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockUpdateProfile).not.toHaveBeenCalledWith({ onboardingCompleted: true });
    expect(mockUpdateProfile).not.toHaveBeenCalledWith(
      expect.objectContaining({ onboardingCompleted: true }),
    );

    fetchMock.mockImplementation(okFetch);
    clickFinish();
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
    fillAndFinish();
    await screen.findByRole("alert");
    expect(mockNavigate).not.toHaveBeenCalled();
    const accountCalls = () => posts(fetchMock, "/accounts").length;
    const accountsFirst = accountCalls();
    expect(accountsFirst).toBeGreaterThan(0);

    entriesOk = true;
    clickFinish();
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
    fillAndFinish();
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/"));
    const created = (suffix: string) =>
      posts(fetchMock, suffix).map(([, init]) => JSON.parse((init as RequestInit).body as string));
    expect(created("/accounts").map((a) => a.name)).not.toContain("Cash and emergency savings");
    expect(created("/budget-entries").map((e) => e.name)).not.toContain("Monthly Take-Home Income");
  });

  it("creates everything when nothing exists yet", async () => {
    const fetchMock = vi.fn().mockImplementation(okFetch);
    globalThis.fetch = fetchMock as any;
    fillAndFinish();
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
    fillAndFinish();
    expect((await screen.findByRole("alert")).textContent).toMatch(/saved some of your details/i);
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
    fillAndFinish();
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
    next();
    expect((screen.getByLabelText(/monthly rent/i) as HTMLInputElement).value).toBe("");
    next();
    for (const label of [
      /total cash and isa savings/i,
      /current pension pot/i,
      /pension contribution/i,
      /credit cards and personal loans/i,
    ]) {
      const input = screen.getByLabelText(label) as HTMLInputElement;
      expect(input.value).toBe("");
      expect(input.placeholder).toMatch(/e\.g\./i);
    }
  });

  it("keeps Finish disabled until income is entered", () => {
    render(<OnboardingRoute />);
    goToReview();
    expect(finishButton().disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Edit You and income" }));
    typeInto(/annual gross salary/i, "45000");
    chooseRegion();
    goToReview();
    expect(finishButton().disabled).toBe(false);
  });

  it("creates no cash or pension accounts when those fields are left empty", async () => {
    const fetchMock = vi.fn().mockImplementation(okFetch);
    globalThis.fetch = fetchMock as any;
    fillAndFinish({});
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/"));
    expect(posts(fetchMock, "/accounts")).toHaveLength(0);
    const profile = mockUpdateProfile.mock.calls[0][0];
    expect(profile.pensionPercent).toBeUndefined();
    expect(profile.birthYear).toBeUndefined();
  });

  describe("skip for now", () => {
    it("skipping income keeps what was typed, moves on and blocks Finish until a region is chosen", () => {
      render(<OnboardingRoute />);
      typeInto(/annual gross salary/i, "45000");
      skip();
      expect(stepHeading(/housing/i)).toBeDefined();
      skip();
      expect(stepHeading("Savings and debt")).toBeDefined();
      skip();
      skip();
      expect(stepHeading(/review what will be saved/i)).toBeDefined();
      expect(finishButton().disabled).toBe(true);
      const hint = screen.getByTestId("finish-income-hint");
      expect(hint.textContent).toMatch(/choose where you pay tax/i);
      expect(finishButton().getAttribute("aria-describedby")).toBe(hint.id);
      fireEvent.click(screen.getByRole("button", { name: /go to you and income/i }));
      expect(stepHeading("You and income")).toBeDefined();
      // Skipping never erases what was typed.
      expect((screen.getByLabelText(/annual gross salary/i) as HTMLInputElement).value).toMatch(
        /45,?000/,
      );
    });

    it("skipping housing keeps what was typed and still allows Finish", async () => {
      render(<OnboardingRoute />);
      typeInto(/annual gross salary/i, "45000");
      chooseRegion();
      next();
      typeInto(/monthly rent/i, "900");
      skip();
      skip();
      skip();
      fireEvent.click(screen.getByRole("button", { name: "Edit Housing and outgoings" }));
      expect((screen.getByLabelText(/monthly rent/i) as HTMLInputElement).value).toBe("900");
      skip();
      skip();
      skip();
      clickFinish();
      await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/"));
      expect(mockUpdateProfile.mock.calls[0][0].monthlyHousingCost).toBe(900);
    });

    it("skipping savings and debt creates no accounts", async () => {
      const fetchMock = vi.fn().mockImplementation(okFetch);
      globalThis.fetch = fetchMock as any;
      render(<OnboardingRoute />);
      typeInto(/annual gross salary/i, "45000");
      chooseRegion();
      next();
      next();
      skip();
      skip();
      clickFinish();
      await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/"));
      expect(posts(fetchMock, "/accounts")).toHaveLength(0);
    });

    it("the bank step is optional: skipping goes to review and nothing is connected", () => {
      const { container } = render(<OnboardingRoute />);
      next();
      next();
      next();
      expect(stepHeading("Bank connection")).toBeDefined();
      expect(screen.getByText("Optional")).toBeDefined();
      expect(container.textContent).not.toMatch(/connected successfully/i);
      skip();
      expect(stepHeading(/review what will be saved/i)).toBeDefined();
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });
  });

  describe("review", () => {
    it("says what is held and does not claim a server save", () => {
      render(<OnboardingRoute />);
      typeInto(/annual gross salary/i, "45000");
      chooseRegion();
      goToReview();
      const note = screen.getByTestId("onboarding-saved-note").textContent ?? "";
      expect(note).toMatch(/until you finish/i);
      expect(note).toMatch(/nothing is saved to your account yet/i);
      expect(screen.getByRole("list", { name: /modules switched on/i })).toBeDefined();
    });

    it("lists the modules that will be switched on", () => {
      render(<OnboardingRoute />);
      fireEvent.click(screen.getByRole("radio", { name: /self-employed/i }));
      goToReview();
      const modules = screen.getByRole("list", { name: /modules switched on/i }).textContent ?? "";
      expect(modules).toContain("Accounts");
      expect(modules).toContain("Tax");
      expect(modules).not.toContain("Debt");
    });
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
    next();
    fireEvent.click(screen.getByRole("radio", { name: /mortgage/i }));
    typeInto(/monthly mortgage payment/i, "900");
    typeInto(/property value/i, "300000");
    typeInto(/mortgage balance/i, "200000");
    typeInto(/other monthly outgoings/i, "700");
    next();
    typeInto(/total cash and isa savings/i, "5000");
    typeInto(/current pension pot/i, "15000");
    typeInto(/pension contribution/i, "5");
    typeInto(/unsecured debt/i, "2000");
    next();
    skip();
    clickFinish();
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
      isSalarySacrifice: false,
      enabledPages: ["accounts", "budget", "savings", "debt", "pension", "mortgage"],
      dashboardWidgets: ["accounts", "budget", "savings", "debt", "pension", "mortgage"],
      dashboardWidgetOrder: ["accounts", "budget", "savings", "debt", "pension", "mortgage"],
    });
    expect(mockUpdateProfile).toHaveBeenLastCalledWith({ onboardingCompleted: true });
  });
});
