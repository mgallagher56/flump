import type { AccountGoalDto } from "@flump/api-contract";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AccountGoalSection } from "./AccountGoalSection";

const makeGoal = (overrides: Partial<AccountGoalDto> = {}): AccountGoalDto => ({
  id: "g-1",
  accountId: "a-1",
  targetAmount: 50,
  targetDate: "2027-06-01",
  label: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

describe("AccountGoalSection", () => {
  it("renders Set a goal with empty defaults and no suggestions when no goal is set", async () => {
    const onSave = vi.fn();
    render(
      <AccountGoalSection
        currentBalance={100}
        goal={null}
        isLiability={false}
        onRemove={vi.fn()}
        onSave={onSave}
        status="idle"
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Set a goal" }));
    const amountInput = screen.getByLabelText("Target amount (optional)") as HTMLInputElement;
    const dateInput = screen.getByLabelText("Target date (optional)") as HTMLInputElement;
    const labelInput = screen.getByLabelText("Note (optional)") as HTMLInputElement;

    expect(amountInput.value).toBe("");
    expect(dateInput.value).toBe("");
    expect(labelInput.value).toBe("");
  });

  it("uses identical wording for £50 and £50,000 goals (N4)", () => {
    const { rerender } = render(
      <AccountGoalSection
        currentBalance={20}
        goal={makeGoal({ targetAmount: 50, targetDate: "2027-06-01" })}
        isLiability={false}
        onRemove={vi.fn()}
        onSave={vi.fn()}
        status="idle"
      />,
    );
    expect(screen.getByTestId("account-goal-summary").textContent).toBe(
      "Goal: £50 in this account by June 2027.",
    );

    rerender(
      <AccountGoalSection
        currentBalance={20}
        goal={makeGoal({ targetAmount: 50000, targetDate: "2027-06-01" })}
        isLiability={false}
        onRemove={vi.fn()}
        onSave={vi.fn()}
        status="idle"
      />,
    );
    expect(screen.getByTestId("account-goal-summary").textContent).toBe(
      "Goal: £50,000 in this account by June 2027.",
    );
  });

  it("shows paid off progress for debts and Balance changed for rising balances", () => {
    const { rerender } = render(
      <AccountGoalSection
        currentBalance={200}
        earliestRecord={{ value: 2000, month: 1, year: 2026 }}
        goal={makeGoal({ targetAmount: 0, targetDate: "2027-03-01" })}
        isLiability={true}
        onRemove={vi.fn()}
        onSave={vi.fn()}
        status="idle"
      />,
    );
    expect(screen.getByTestId("account-goal-progress").textContent).toBe(
      "£1,800 paid off since January.",
    );

    rerender(
      <AccountGoalSection
        currentBalance={2300}
        earliestRecord={{ value: 2000, month: 1, year: 2026 }}
        goal={makeGoal({ targetAmount: 0, targetDate: "2027-03-01" })}
        isLiability={true}
        onRemove={vi.fn()}
        onSave={vi.fn()}
        status="idle"
      />,
    );
    expect(screen.getByTestId("account-goal-progress").textContent).toBe(
      "Balance changed by +£300 since January.",
    );
  });

  it("changes nothing on screen when a goal date has passed and is unreached (N3)", () => {
    render(
      <AccountGoalSection
        currentBalance={25}
        goal={makeGoal({ targetAmount: 500, targetDate: "2020-01-01" })}
        isLiability={false}
        onRemove={vi.fn()}
        onSave={vi.fn()}
        status="idle"
      />,
    );
    expect(screen.queryByTestId("account-goal-reached")).toBeNull();
    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/missed|overdue|behind|failed|lost/i);
  });

  it("shows one plain dated fact line when a goal is reached (W6)", () => {
    render(
      <AccountGoalSection
        currentBalance={0}
        goal={makeGoal({ targetAmount: 0, targetDate: "2027-03-01" })}
        isLiability={true}
        onRemove={vi.fn()}
        onSave={vi.fn()}
        status="idle"
      />,
    );
    expect(screen.getByTestId("account-goal-reached").textContent).toBe(
      "Balance £0. You set this goal for March 2027.",
    );
  });

  it("shows Goal changed. after updating an existing goal and removes without a guilt prompt", async () => {
    const onSave = vi.fn();
    const onRemove = vi.fn();
    const { rerender } = render(
      <AccountGoalSection
        currentBalance={100}
        goal={makeGoal({ targetAmount: 500 })}
        isLiability={false}
        onRemove={onRemove}
        onSave={onSave}
        status="idle"
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Change goal" }));
    await userEvent.click(screen.getByRole("button", { name: "Save goal" }));
    expect(onSave).toHaveBeenCalledOnce();

    rerender(
      <AccountGoalSection
        currentBalance={100}
        goal={makeGoal({ targetAmount: 500 })}
        isLiability={false}
        onRemove={onRemove}
        onSave={onSave}
        status="succeeded"
      />,
    );
    expect(screen.getByTestId("account-goal-status").textContent).toBe("Goal changed.");

    await userEvent.click(screen.getByRole("button", { name: "Remove goal" }));
    expect(onRemove).toHaveBeenCalledOnce();
  });
});
