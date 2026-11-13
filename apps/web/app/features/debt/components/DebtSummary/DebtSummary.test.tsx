import { describe, expect, test } from "vitest";
import customRender from "~/testUtils/customRender";
import { DebtSummary, type DebtSummaryProps } from "./DebtSummary";

const props: DebtSummaryProps = {
  totalDebt: 8400,
  highInterestDebt: 5200,
  monthlyMinimumTotal: 210,
  extraPayment: 50,
  debtFreeDate: "Aug 2028",
  totalInterestSaved: 640,
  monthsShaved: 7,
  strategy: "avalanche",
};

describe("<DebtSummary />", () => {
  test("shows four KPIs with 'Debt-free by' as the single hero", () => {
    const { container, getByText } = customRender(<DebtSummary {...props} />);
    const heroes = container.querySelectorAll("[data-tone='hero']");
    expect(heroes).toHaveLength(1);
    expect(heroes[0]?.textContent).toContain("Debt-free by");
    expect(heroes[0]?.textContent).toContain("Aug 2028");
    expect(heroes[0]?.textContent).toContain("7 months sooner than minimum payments");
    for (const label of ["Total you owe", "Paying each month", "Interest saved"]) {
      expect(getByText(label)).toBeDefined();
    }
    expect(container.textContent).toContain("£260");
  });

  test("an unknown APR never shows an invented date or saving, and drops the hero", () => {
    const { container, getAllByText } = customRender(<DebtSummary {...props} aprUnknown />);
    expect(container.querySelectorAll("[data-tone='hero']")).toHaveLength(0);
    expect(container.textContent).not.toContain("Aug 2028");
    expect(container.textContent).not.toContain("£640");
    expect(getAllByText("Not calculated")).toHaveLength(2);
    expect(getAllByText("Add each debt's APR to calculate this")).toHaveLength(2);
  });

  test("payments that never clear the debt are stated, not projected", () => {
    const { container } = customRender(<DebtSummary {...props} payoffAchievable={false} />);
    expect(container.textContent).toContain("Your payments do not clear the debt yet");
    expect(container.textContent).not.toContain("Aug 2028");
  });

  test("flags estimated minimums and the snowball order in plain words", () => {
    const { container } = customRender(
      <DebtSummary {...props} minimumEstimated strategy="snowball" />,
    );
    expect(container.textContent).toContain("(minimums estimated)");
    expect(container.querySelector("[data-tone='hero']")?.textContent).toContain("estimated");
    expect(container.textContent).toContain("paying smallest balance first");
  });
});
