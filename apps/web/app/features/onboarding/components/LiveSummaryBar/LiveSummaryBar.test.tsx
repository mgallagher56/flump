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
    expect(screen.getAllByText("Not set")).toHaveLength(3);
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
    expect(takeHome.textContent).toBe("£3,000/mo");
    expect(takeHome.getAttribute("data-figure")).toBe("takeHome.monthly");
    expect(screen.getByTestId("onboarding-surplus").textContent).toBe("+£2,000/mo");
    expect(screen.getByTestId("onboarding-net-worth").textContent).toBe("£12,000");
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

  it("states a negative surplus with a minus sign", () => {
    render(
      <LiveSummaryBar
        assumingRegion={false}
        summary={summaryFor({
          incomeMode: "net",
          monthlyTakeHome: 1000,
          monthlyOtherOutgoings: 1500,
        })}
      />,
    );
    const surplus = screen.getByTestId("onboarding-surplus");
    expect(surplus.textContent).toMatch(/^[-−]£500\/mo$/);
    // Same neutral ink as take-home: the sign, not a colour, carries the direction.
    expect(surplus.className).toBe(screen.getByTestId("onboarding-take-home").className);
  });

  it("draws a negative net worth in neutral ink with its sign", () => {
    render(
      <LiveSummaryBar
        assumingRegion={false}
        summary={summaryFor({ incomeMode: "net", monthlyTakeHome: 1000, unsecuredDebt: 4000 })}
      />,
    );
    const worth = screen.getByTestId("onboarding-net-worth");
    expect(worth.textContent).toMatch(/^[-−]£4,000$/);
    expect(worth.className).toBe(screen.getByTestId("onboarding-take-home").className);
  });
});
