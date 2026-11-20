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
    // A typed take-home is the person's own figure, so it is not labelled an estimate.
    expect(screen.getByText("Monthly take-home pay")).toBeDefined();
    expect(screen.queryByText("Monthly take-home pay (estimate)")).toBeNull();
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

  it("shows no note when the pension is answered as 0 and nothing else is deducted", () => {
    render(
      <LiveSummaryBar
        assumingRegion={false}
        summary={summaryFor({ grossSalary: 45000, taxRegion: "ENGLAND", pensionPercent: 0 })}
      />,
    );
    expect(screen.queryByTestId("onboarding-take-home-note")).toBeNull();
  });

  it("says the figure is before any pension while the pension field is blank", () => {
    render(
      <LiveSummaryBar
        assumingRegion={false}
        summary={summaryFor({ grossSalary: 45000, taxRegion: "ENGLAND" })}
      />,
    );
    expect(screen.getByTestId("onboarding-take-home-note").textContent).toBe(
      "Before any pension contribution",
    );
  });
});

describe("<LiveSummaryBar /> with a refused take-home", () => {
  it("shows the one refusal line in place of the figure, never £0", () => {
    const notice =
      "Scottish Income Tax rates for 2027/28 are not published yet, so there is no estimate for this year.";
    const summary = { ...summaryFor({ grossSalary: 40000 }), takeHomeRefusal: notice };
    const { container } = render(<LiveSummaryBar assumingRegion={false} summary={summary} />);
    expect(screen.getByText(notice)).toBeDefined();
    expect(container.querySelector('[data-figure="takeHome.monthly"]')).toBeNull();
    expect(container.textContent).not.toContain("£0");
  });
});
