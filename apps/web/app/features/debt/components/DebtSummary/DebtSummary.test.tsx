import { fireEvent } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import customRender from "~/testUtils/customRender";
import { DebtSummary, type DebtSummaryProps } from "./DebtSummary";

const props: DebtSummaryProps = {
  totalDebt: 8400,
  debtCount: 2,
  monthlyMinimumTotal: 210,
  debtFreeDate: "August 2028",
  interestThisYear: 640,
};

describe("<DebtSummary />", () => {
  test("puts the saved total in the hero and the estimated date first in the strip", () => {
    const { container, getByText } = customRender(<DebtSummary {...props} />);
    const heroes = container.querySelectorAll("[data-tone='hero']");
    expect(heroes).toHaveLength(1);
    expect(heroes[0]?.textContent).toContain("Total you owe");
    expect(heroes[0]?.textContent).toContain("£8,400");
    expect(heroes[0]?.textContent).not.toMatch(/estimate/i);
    expect(heroes[0]?.textContent).not.toContain("August 2028");
    expect(getByText("Debt-free by")).toBeDefined();
    expect(container.textContent).toContain("August 2028");
    expect(container.textContent).toContain("Estimate at your current payments");
    expect(getByText("Interest this year")).toBeDefined();
    expect(container.textContent).toContain("£210");
    expect(container.textContent).toContain("£640");
  });

  test("shows a liability stored as a negative balance as a positive amount owed", () => {
    const { container } = customRender(<DebtSummary {...props} totalDebt={-8400} />);
    const hero = container.querySelector("[data-tone='hero']");
    expect(hero?.textContent).toContain("£8,400");
    expect(hero?.textContent).not.toMatch(/[-−]£|minus/);
  });

  test("a missing APR shows one prompt with one button, never 'Not set' cards", () => {
    const onAddRate = vi.fn();
    const { container, getByRole, getByText } = customRender(
      <DebtSummary {...props} missingAprCount={2} onAddRate={onAddRate} />,
    );
    expect(container.textContent).not.toContain("Not set");
    expect(container.textContent).not.toContain("August 2028");
    expect(container.textContent).not.toContain("£640");
    expect(getByText("Add the rate for 2 debts to see your debt-free date")).toBeDefined();
    fireEvent.click(getByRole("button", { name: "Add a rate" }));
    expect(onAddRate).toHaveBeenCalledTimes(1);
  });

  test("payments that never pay off the debt are stated, not projected", () => {
    const { container } = customRender(<DebtSummary {...props} payoffAchievable={false} />);
    expect(container.textContent).toContain("Not paid off");
    expect(container.textContent).toContain(
      "Estimate: at the minimum payments, these debts are not paid off",
    );
    expect(container.textContent).not.toContain("August 2028");
  });

  test("flags estimated minimum payments in plain words", () => {
    const { container } = customRender(<DebtSummary {...props} minimumEstimated />);
    expect(container.textContent).toContain("Minimum payments, some are estimates");
    expect(container.textContent).toContain("Some minimum payments are estimates");
  });
});
