import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RetirementPlanner } from "./RetirementPlanner";

describe("RetirementPlanner", () => {
  const baseProps = {
    currentAge: 42,
    accounts: [
      {
        id: "11111111-1111-4111-8111-111111111111",
        name: "Workplace Pension",
        type: "Pension",
        balanceGbp: 100_000,
        monthlyContributionGbp: 500,
      },
    ],
    accountDetails: [
      { accountId: "11111111-1111-4111-8111-111111111111", year: 2026, month: 11, value: 100_000 },
    ],
    budgetEntries: [
      {
        id: "33333333-3333-4333-8333-333333333333",
        category: "essentials",
        name: "Groceries",
        amount: 500,
        frequency: "monthly",
        isIncome: false,
        isEssential: true,
      },
    ],
    housing: { housingStatus: "own_outright" as const },
    savedPlan: null,
  };

  it("renders the three growth cases, KPI strip, and ProjectionNotice without advice wording", () => {
    const { container } = render(<RetirementPlanner {...baseProps} />);
    expect(screen.getByText("Retirement plan")).toBeTruthy();
    expect(screen.getAllByText("Lower case (2%)").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Middle case (5%)").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Higher case (8%)").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Unverified estimate/).length).toBeGreaterThanOrEqual(1);
    expect(container.textContent).not.toMatch(/\b(should|need|enough|on track|shortfall)\b/i);
  });

  it("switches to budget-built target and calls onSavePlan with If-Match etag", async () => {
    const user = userEvent.setup();
    const onSavePlan = vi.fn();
    render(
      <RetirementPlanner
        {...baseProps}
        etag='"2026-11-16T10:00:00.000Z"'
        onSavePlan={onSavePlan}
      />,
    );

    await user.click(screen.getByRole("button", { name: "From budget lines" }));
    expect(screen.getByText("Groceries")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Save plan" }));
    expect(onSavePlan).toHaveBeenCalledTimes(1);
    expect(onSavePlan.mock.calls[0]?.[1]).toBe('"2026-11-16T10:00:00.000Z"');
    expect(onSavePlan.mock.calls[0]?.[0]).toMatchObject({
      target: {
        kind: "budget",
        lineSettings: [
          { budgetEntryId: "33333333-3333-4333-8333-333333333333", status: "continues" },
        ],
      },
    });
  });
});
