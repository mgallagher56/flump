import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { STUDENT_LOAN_COPY, StudentLoanCalculator } from "./StudentLoanCalculator";

const slider = (label: string) => screen.getByLabelText(`${label} range slider`);
const pill = (label: string) => screen.getByLabelText(`${label} input`);
const planSelect = () => screen.getByLabelText(STUDENT_LOAN_COPY.plan);
const outcomes = () => within(screen.getByTestId("student-loan-outcomes"));
const toolText = () => screen.getByTestId("student-loan-tool").textContent ?? "";

describe("StudentLoanCalculator", () => {
  it("shows the monthly and yearly repayment and the projected outcome for the defaults", () => {
    render(<StudentLoanCalculator />);
    // Plan 2, £38,000 salary, £45,000 balance: 9% above the threshold, £775.35 a year.
    const cards = outcomes();
    expect(cards.getByText(STUDENT_LOAN_COPY.kpiMonth)).toBeDefined();
    expect(cards.getByText("£65")).toBeDefined();
    expect(cards.getByText("£775")).toBeDefined();
    expect(cards.getByText(STUDENT_LOAN_COPY.outcomeWrittenOff(30))).toBeDefined();
    expect(toolText()).toContain(
      "Estimate: repayments of £775 a year do not pay off the £45,000 balance in 30 years.",
    );
  });

  it("recalculates when the salary changes and states a repaid outcome neutrally", () => {
    render(<StudentLoanCalculator />);
    fireEvent.change(slider(STUDENT_LOAN_COPY.salary), { target: { value: "120000" } });
    expect(outcomes().getByText("£680")).toBeDefined();
    expect(outcomes().getByText(STUDENT_LOAN_COPY.outcomeRepaid)).toBeDefined();
  });

  it("uses the plan chosen", () => {
    render(<StudentLoanCalculator />);
    fireEvent.change(planSelect(), { target: { value: "plan5" } });
    // Plan 5: 9% above £25,000, £1,170 a year, written off after 40 years.
    expect(outcomes().getByText("£1,170")).toBeDefined();
    expect(outcomes().getByText(STUDENT_LOAN_COPY.outcomeWrittenOff(40))).toBeDefined();
  });

  it("says there is nothing to repay for a zero balance", () => {
    render(<StudentLoanCalculator initialBalance={0} />);
    expect(outcomes().getByText(STUDENT_LOAN_COPY.outcomeNothingOwed)).toBeDefined();
  });

  it("never passes a negative entry to the engine", () => {
    render(<StudentLoanCalculator initialSalary={-1000} />);
    fireEvent.focus(pill(STUDENT_LOAN_COPY.balance));
    fireEvent.change(pill(STUDENT_LOAN_COPY.balance), { target: { value: "-500" } });
    fireEvent.blur(pill(STUDENT_LOAN_COPY.balance));
    expect(toolText()).not.toMatch(/£-|-£|−£/);
  });

  it("has three visible inputs at most and exactly one notice", () => {
    render(<StudentLoanCalculator />);
    expect(screen.getAllByRole("slider").length + screen.getAllByRole("combobox").length).toBe(3);
    expect(screen.getAllByTestId("projection-notice")).toHaveLength(1);
  });

  it("states facts only, with no recommendation and no judging words", () => {
    render(<StudentLoanCalculator />);
    expect(screen.getByRole("heading", { level: 2, name: /UK student loan/ })).toBeDefined();
    expect(toolText()).not.toMatch(
      /verdict|should|overpay|statutory|outstanding|gross|\/mo|\/yr|career/i,
    );
  });

  it("shows one arrow on the sign-up button when the caller's label has its own", () => {
    render(<StudentLoanCalculator ctaText="Request an invite →" />);
    expect(screen.getByRole("button", { name: "Request an invite" })).toBeDefined();
  });

  it("calls onSaveAndContinue with the salary and selected plan", () => {
    const onSave = vi.fn();
    render(<StudentLoanCalculator onSaveAndContinue={onSave} persistSeed={false} />);
    fireEvent.change(planSelect(), { target: { value: "plan5" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue to sign up" }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        annualIncome: 38000,
        studentLoanPlan: "plan5",
        inferredModules: ["accounts", "budget", "tax"],
      }),
    );
  });

  it("styles come from recipes, with no inline styles or alarm colours", () => {
    const tsx = readFileSync(join(__dirname, "StudentLoanCalculator.tsx"), "utf8");
    const styles = readFileSync(join(__dirname, "StudentLoanCalculator.styles.ts"), "utf8");
    expect(tsx).not.toContain("style={{");
    expect(`${tsx}${styles}`).not.toMatch(/status\.(danger|warning)|#[0-9a-f]{3,6}\b/i);
  });
});
