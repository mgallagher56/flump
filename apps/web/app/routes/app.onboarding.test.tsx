import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import OnboardingRoute from "./app.onboarding";

const mockUpdateProfile = vi.fn().mockResolvedValue(undefined);
const mockNavigate = vi.fn();

vi.mock("react-router", () => ({
  useLoaderData: () => ({
    userProfile: {
      enabledPages: ["accounts", "budget", "savings", "pension"],
    },
    user: { name: "Alex" },
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

describe("OnboardingRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders welcome screen with choice between questionnaire and manual picker", () => {
    render(<OnboardingRoute />);
    expect(screen.getByText(/Welcome to Flump, Alex/i)).toBeDefined();
    expect(screen.getByText("Answer 5 Quick Questions")).toBeDefined();
    expect(screen.getByText("Choose Modules Manually")).toBeDefined();
  });

  it("allows starting the questionnaire and answering questions", () => {
    render(<OnboardingRoute />);

    // Click to start quiz
    fireEvent.click(screen.getByText("Answer 5 Quick Questions"));

    // First question should be active
    expect(screen.getByText("Question 1 of 5")).toBeDefined();
    expect(
      screen.getByText("Do you want to manage accounts and plan your monthly budget?"),
    ).toBeDefined();

    // Answer Yes to Q1
    fireEvent.click(screen.getByText("Yes, include Accounts & Budgeting"));

    // Advances to Q2
    expect(screen.getByText("Question 2 of 5")).toBeDefined();
    expect(
      screen.getByText("Do you have savings accounts or investment portfolios?"),
    ).toBeDefined();
  });

  it("allows skipping to manual module selection and finishing setup", async () => {
    render(<OnboardingRoute />);

    // Click manual picker
    fireEvent.click(screen.getByText("Choose Modules Manually"));

    // Should render manual module list
    expect(screen.getByText("Select Your Active Modules")).toBeDefined();
    expect(screen.getByText("Accounts & Net Worth")).toBeDefined();
    expect(screen.getByText("Budget Planner")).toBeDefined();
    expect(screen.getByText("Savings & Investments")).toBeDefined();
    expect(screen.getByText("Pension & Retirement")).toBeDefined();

    // Toggle a module off and on
    const pensionCard = screen.getByText("Pension & Retirement");
    fireEvent.click(pensionCard);

    // Click Finish Setup button
    const finishBtn = screen.getByText("Finish Setup & Launch Dashboard →");
    fireEvent.click(finishBtn);

    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          onboardingCompleted: true,
          enabledPages: expect.any(Array),
          dashboardWidgets: expect.any(Array),
        }),
      );
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });
  });

  it("navigates back to the welcome screen from the first question when Back is clicked", () => {
    render(<OnboardingRoute />);

    // Start quiz
    fireEvent.click(screen.getByText("Answer 5 Quick Questions"));
    expect(screen.getByText("Question 1 of 5")).toBeDefined();

    // Click Back
    const backBtn = screen.getByRole("button", { name: /back/i });
    expect(backBtn).toBeDefined();
    fireEvent.click(backBtn);

    // Should be back on Welcome screen
    expect(screen.getByText(/Welcome to Flump, Alex/i)).toBeDefined();
    expect(screen.getByText("Answer 5 Quick Questions")).toBeDefined();
  });

  it("navigates back to Question 1 from Question 2 when Back is clicked", () => {
    render(<OnboardingRoute />);

    // Start quiz and advance to Q2
    fireEvent.click(screen.getByText("Answer 5 Quick Questions"));
    fireEvent.click(screen.getByText("Yes, include Accounts & Budgeting"));
    expect(screen.getByText("Question 2 of 5")).toBeDefined();

    // Click Back
    const backBtn = screen.getByRole("button", { name: /back/i });
    fireEvent.click(backBtn);

    // Should be back on Question 1
    expect(screen.getByText("Question 1 of 5")).toBeDefined();
  });

  it("navigates back to welcome screen from manual picker if opened directly from welcome", () => {
    render(<OnboardingRoute />);

    // Open manual picker directly
    fireEvent.click(screen.getByText("Choose Modules Manually"));
    expect(screen.getByText("Select Your Active Modules")).toBeDefined();

    // Click Back to Welcome
    const backBtn = screen.getByRole("button", { name: /back to welcome/i });
    fireEvent.click(backBtn);

    // Should be back on Welcome screen
    expect(screen.getByText(/Welcome to Flump, Alex/i)).toBeDefined();
  });

  it("navigates back to questionnaire from manual picker if opened from quiz skip", () => {
    render(<OnboardingRoute />);

    // Start quiz
    fireEvent.click(screen.getByText("Answer 5 Quick Questions"));
    expect(screen.getByText("Question 1 of 5")).toBeDefined();

    // Skip to manual picker
    fireEvent.click(screen.getByText("Skip to Review"));
    expect(screen.getByText("Select Your Active Modules")).toBeDefined();

    // Click Back to Questions
    const backBtn = screen.getByRole("button", { name: /back to questions/i });
    fireEvent.click(backBtn);

    // Should return to the questionnaire
    expect(screen.getByText("Question 1 of 5")).toBeDefined();
  });

  it("hydrates baseline figures from localStorage seed and shows pre-loaded banner", () => {
    const seed = {
      grossSalary: 85000,
      pensionContributionPct: 8,
      salarySacrifice: true,
      initialCashSavings: 20000,
      initialInvestments: 30000,
      monthlyContribution: 800,
      inferredModules: ["accounts", "budget", "pension", "savings", "forecast"],
      timestamp: Date.now(),
    };
    localStorage.setItem("flump_onboarding_seed", JSON.stringify(seed));

    render(<OnboardingRoute />);

    expect(
      screen.getByText(/we've pre-loaded your £85,000 salary and savings baseline/i),
    ).toBeDefined();
    expect(screen.getByText(/launch dashboard with this baseline \(10s\) →/i)).toBeDefined();

    localStorage.removeItem("flump_onboarding_seed");
  });

  it("navigates through progressive 3-step baseline flow", () => {
    const seed = {
      grossSalary: 70000,
      pensionContributionPct: 5,
      salarySacrifice: true,
      initialCashSavings: 15000,
      initialInvestments: 25000,
      monthlyContribution: 600,
      inferredModules: ["accounts", "budget", "savings", "pension", "forecast"],
      timestamp: Date.now(),
    };
    localStorage.setItem("flump_onboarding_seed", JSON.stringify(seed));

    render(<OnboardingRoute />);

    // Click "Review & Tweak Numbers"
    const reviewBtn = screen.getByText("Review & Tweak Numbers");
    fireEvent.click(reviewBtn);

    // Step 1: Income & Tax Status
    expect(screen.getByText("Step 1: Income & Tax Status")).toBeDefined();
    expect(screen.getByText(/live take-home preview/i)).toBeDefined();

    // Advance to Step 2
    fireEvent.click(screen.getByText(/next: cash & debt/i));
    expect(screen.getByText("Step 2: High-Level Cash & Debt")).toBeDefined();
    expect(screen.getByText(/starting estimated net worth/i)).toBeDefined();

    // Advance to Step 3
    fireEvent.click(screen.getByText(/next: workspace modules/i));
    expect(screen.getByText("Step 3: Confirm Your Workspace Modules")).toBeDefined();

    localStorage.removeItem("flump_onboarding_seed");
  });
});
