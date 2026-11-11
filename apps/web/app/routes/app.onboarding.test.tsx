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
    enabledPages: ["accounts", "budget", "savings", "pension", "mortgage", "forecast", "tax"],
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

describe("OnboardingRoute (3-Step Baseline Flow)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockActionData = undefined;
    vi.stubGlobal("ENV", { VITE_API_URL: "https://api.example.test" });
    globalThis.fetch = vi
      .fn()
      .mockImplementation(
        async () => new Response(JSON.stringify({ success: true }), { status: 200 }),
      );
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
      expect(mockUpdateBaseline).toHaveBeenCalled();
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
      inferredModules: ["accounts", "budget", "pension", "savings", "forecast"] as const,
      timestamp: Date.now(),
    };
    persistOnboardingSeed(seed as any);

    render(<OnboardingRoute />);

    expect(screen.getByText(/we've pre-loaded your £75,000 salary/i)).toBeDefined();
    const quickLaunchBtn = screen.getByText(/launch dashboard with this baseline \(10s\) →/i);
    fireEvent.click(quickLaunchBtn);

    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });

    clearOnboardingSeed();
  });

  const finish = () => {
    render(<OnboardingRoute />);
    fireEvent.click(screen.getByText("Next: Housing and outgoings →"));
    fireEvent.click(screen.getByText("Next: Savings, pension and debt →"));
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

    fetchMock.mockImplementation(async () => new Response("{}", { status: 200 }));
    fireEvent.click(screen.getByRole("button", { name: /finish setup and launch dashboard/i }));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/"));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("retries only failed seed jobs after a partial success", async () => {
    let entriesOk = false;
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (url.endsWith("/budget-entries") && !entriesOk) return new Response(null, { status: 503 });
      return new Response("{}", { status: 200 });
    });
    globalThis.fetch = fetchMock as any;
    finish();
    await screen.findByRole("alert");
    expect(mockNavigate).not.toHaveBeenCalled();
    const accountCalls = () =>
      fetchMock.mock.calls.filter(([u]) => String(u).endsWith("/accounts")).length;
    const accountsFirst = accountCalls();
    expect(accountsFirst).toBeGreaterThan(0);

    entriesOk = true;
    fireEvent.click(screen.getByRole("button", { name: /finish setup and launch dashboard/i }));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/"));
    expect(accountCalls()).toBe(accountsFirst);
    expect(mockUpdateProfile).toHaveBeenLastCalledWith({ onboardingCompleted: true });
  });
});
