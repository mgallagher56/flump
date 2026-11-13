import { describe, expect, test } from "vitest";
import customRender from "~/testUtils/customRender";
import { DebtSummary, type DebtSummaryProps } from "./DebtSummary";

const props: DebtSummaryProps = {
  totalDebt: 8400,
  highInterestDebt: 5200,
  monthlyMinimumTotal: 210,
  debtFreeDate: "Aug 2028",
  totalInterest: 640,
};

describe("<DebtSummary />", () => {
  test("shows four KPIs with 'Debt-free by' as the single hero", () => {
    const { container, getByText } = customRender(<DebtSummary {...props} />);
    const heroes = container.querySelectorAll("[data-tone='hero']");
    expect(heroes).toHaveLength(1);
    expect(heroes[0]?.textContent).toContain("Debt-free by");
    expect(heroes[0]?.textContent).toContain("Aug 2028");
    expect(heroes[0]?.textContent).toContain("Paying the minimums only");
    for (const label of ["Total you owe", "Paying each month", "Interest to pay"]) {
      expect(getByText(label)).toBeDefined();
    }
    expect(container.textContent).toContain("£210");
    expect(container.textContent).toContain("£640");
  });

  test("an unknown APR never shows an invented date or saving, and drops the hero", () => {
    const { container, getAllByText } = customRender(<DebtSummary {...props} aprUnknown />);
    expect(container.querySelectorAll("[data-tone='hero']")).toHaveLength(0);
    expect(container.textContent).not.toContain("Aug 2028");
    expect(container.textContent).not.toContain("£640");
    expect(getAllByText("Not set")).toHaveLength(2);
    expect(getAllByText("Add each debt's APR to calculate this")).toHaveLength(2);
  });

  test("payments that never clear the debt are stated, not projected", () => {
    const { container } = customRender(<DebtSummary {...props} payoffAchievable={false} />);
    expect(container.textContent).toContain("Your minimum payments do not clear the debt yet");
    expect(container.textContent).not.toContain("Aug 2028");
  });

  test("flags estimated minimums in plain words", () => {
    const { container } = customRender(<DebtSummary {...props} minimumEstimated />);
    expect(container.textContent).toContain("(minimums estimated)");
    expect(container.querySelector("[data-tone='hero']")?.textContent).toContain("estimated");
  });
});
