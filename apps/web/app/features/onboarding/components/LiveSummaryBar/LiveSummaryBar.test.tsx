import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { deriveOnboardingSummary } from "../../deriveOnboardingSummary";
import { INITIAL_VALUES, type OnboardingValues } from "../../types";
import { LiveSummaryBar } from "./LiveSummaryBar";

const summaryFor = (patch: Partial<OnboardingValues>) =>
  deriveOnboardingSummary({ ...INITIAL_VALUES, ...patch });

describe("<LiveSummaryBar />", () => {
  it("shows Not set, never £0, while nothing is known", () => {
    render(<LiveSummaryBar assumingRegion={false} summary={summaryFor({})} />);
    expect(screen.getAllByText("Not set")).toHaveLength(1);
  });

  it("shows one figure only: the monthly take-home", () => {
    render(
      <LiveSummaryBar
        assumingRegion={false}
        summary={summaryFor({ incomeMode: "net", monthlyTakeHome: 3000, cashSavings: 12000 })}
      />,
    );
    expect(screen.getByText("Monthly take-home pay (estimate)")).toBeDefined();
    expect(screen.queryByTestId("onboarding-surplus")).toBeNull();
    expect(screen.queryByTestId("onboarding-net-worth")).toBeNull();
    expect(screen.getByTestId("onboarding-live-summary").textContent?.match(/£/g)).toHaveLength(1);
  });

  it("formats en-GB figures and keeps the take-home hooks", () => {
    render(
      <LiveSummaryBar
        assumingRegion
        summary={summaryFor({
          incomeMode: "net",
          monthlyTakeHome: 3000,
          monthlyHousingCost: 1000,
          cashSavings: 12000,
        })}
      />,
    );
    const takeHome = screen.getByTestId("onboarding-take-home");
    expect(takeHome.textContent).toBe("£3,000");
    expect(takeHome.getAttribute("data-figure")).toBe("takeHome.monthly");
    expect(screen.getByTestId("onboarding-take-home-assumption")).toBeDefined();
  });

  it("says in one sentence why the take-home includes pension and student loan", () => {
    render(
      <LiveSummaryBar
        assumingRegion={false}
        summary={summaryFor({
          grossSalary: 45000,
          taxRegion: "ENGLAND",
          studentLoanPlan: "PLAN_2",
          pensionPercent: 5,
        })}
      />,
    );
    expect(screen.getByTestId("onboarding-take-home-note").textContent).toBe(
      "Now includes your 5% pension and student loan",
    );
  });

  it("shows no note when nothing is deducted beyond tax and NI", () => {
    render(
      <LiveSummaryBar
        assumingRegion={false}
        summary={summaryFor({ grossSalary: 45000, taxRegion: "ENGLAND" })}
      />,
    );
    expect(screen.queryByTestId("onboarding-take-home-note")).toBeNull();
  });
});
