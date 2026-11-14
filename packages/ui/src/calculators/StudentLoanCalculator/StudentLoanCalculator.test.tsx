import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { STUDENT_LOAN_COPY, StudentLoanCalculator } from "./StudentLoanCalculator";

const slider = (label: string) => screen.getByLabelText(label);
const pill = (label: string) => screen.getByLabelText(`${label} input`);
const planSelect = () => screen.getByLabelText(STUDENT_LOAN_COPY.plan);
const outcomes = () => within(screen.getByTestId("student-loan-outcomes"));
const openExplainer = () =>
  fireEvent.click(screen.getByRole("button", { name: STUDENT_LOAN_COPY.explainerTitle }));
const toolText = () => screen.getByTestId("student-loan-tool").textContent ?? "";

describe("StudentLoanCalculator", () => {
  it("leads with the projected outcome and supports it with the monthly repayment", () => {
    render(<StudentLoanCalculator />);
    // Plan 2, £38,000 salary, £45,000 balance: 9% above the threshold, £775.35 a year (£65 a
    // month), which does not pay off the balance before write-off after 30 years.
    const cards = screen.getByTestId("student-loan-outcomes");
    const [headline, supporting] = Array.from(cards.children);
    expect(headline?.textContent).toContain(STUDENT_LOAN_COPY.outcomeWrittenOff(30));
    expect(headline?.textContent).toContain(STUDENT_LOAN_COPY.reasonWrittenOff);
    expect(supporting?.textContent).toContain(STUDENT_LOAN_COPY.kpiMonth);
    expect(supporting?.textContent).toContain("£65");
    expect(cards.children).toHaveLength(2);
    // The yearly figure is no longer a card of its own.
    expect(toolText()).not.toContain("£775");
  });

  it("sets the worded answer in a text style, not the KPI number style", () => {
    const styles = readFileSync(join(__dirname, "StudentLoanCalculator.styles.ts"), "utf8");
    const block = styles.slice(styles.indexOf("studentLoanOutcomeText"));
    expect(block.slice(0, 200)).toMatch(/textStyle: "heading\./);
    render(<StudentLoanCalculator />);
    expect(outcomes().getByText(STUDENT_LOAN_COPY.outcomeWrittenOff(30)).tagName).toBe("SPAN");
  });

  it("keeps figures out of the captions and puts the working in the explainer", () => {
    for (const w of [
      STUDENT_LOAN_COPY.kpiMonthSubtext,
      STUDENT_LOAN_COPY.reasonRepaid,
      STUDENT_LOAN_COPY.reasonWrittenOff,
    ]) {
      expect(w).not.toMatch(/[0-9£%]/);
    }
    render(<StudentLoanCalculator />);
    // Closed by default, so the working adds no figures to the first view.
    expect(toolText()).not.toContain("£29,385");
    expect(
      screen
        .getByRole("button", { name: STUDENT_LOAN_COPY.explainerTitle })
        .getAttribute("aria-expanded"),
    ).toBe("false");
    openExplainer();
    expect(toolText()).toContain("Repayments on this plan are 9% of pay above £29,385 a year.");
  });

  it("puts the sign-up button under the result, before the explainer and notice", () => {
    render(<StudentLoanCalculator />);
    const button = screen.getByRole("button", { name: "Continue to sign up" });
    const cards = screen.getByTestId("student-loan-outcomes");
    const notice = screen.getByTestId("projection-notice");
    expect(cards.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(button.compareDocumentPosition(notice) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("hides its own title and intro when embedded, with no skipped heading level", () => {
    render(<StudentLoanCalculator embedded />);
    expect(screen.queryByText(STUDENT_LOAN_COPY.title)).toBeNull();
    expect(screen.queryByText(STUDENT_LOAN_COPY.intro)).toBeNull();
    const levels = Array.from(
      screen.getByTestId("student-loan-tool").querySelectorAll("h1, h2, h3, h4, h5, h6"),
    ).map((h) => Number(h.tagName.slice(1)));
    // The explainer is a drawer, not a heading; any heading left must start at h2.
    expect(levels.length === 0 || levels[0] === 2).toBe(true);
    for (let i = 1; i < levels.length; i++) {
      expect((levels[i] ?? 0) - (levels[i - 1] ?? 0)).toBeLessThanOrEqual(1);
    }
  });

  it("keeps the Plan 2 label word for word", () => {
    render(<StudentLoanCalculator />);
    expect(screen.getByRole("option", { name: "Plan 2 (2012–2023 England/Wales)" })).toBeDefined();
  });

  it("recalculates when the salary changes and states a repaid outcome neutrally", () => {
    render(<StudentLoanCalculator />);
    fireEvent.change(slider(STUDENT_LOAN_COPY.salary), { target: { value: "120000" } });
    // £8,155 a year: £680 a month.
    expect(outcomes().getByText("£680")).toBeDefined();
    expect(outcomes().getByText(STUDENT_LOAN_COPY.reasonRepaid)).toBeDefined();
    expect(outcomes().getByText(STUDENT_LOAN_COPY.outcomeRepaid)).toBeDefined();
  });

  it("uses the plan chosen", () => {
    render(<StudentLoanCalculator />);
    fireEvent.change(planSelect(), { target: { value: "plan5" } });
    // Plan 5: 9% above £25,000, £1,170 a year (£97.50 a month), written off after 40 years.
    expect(outcomes().getByText("£98")).toBeDefined();
    openExplainer();
    expect(toolText()).toContain("9% of pay above £25,000 a year");
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
