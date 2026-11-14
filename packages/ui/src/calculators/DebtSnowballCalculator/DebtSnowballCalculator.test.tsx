import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  DEBT_SNOWBALL_COPY,
  DebtSnowballCalculator,
  debtSnowballAnnouncement,
  formatPayoffDuration,
} from "./DebtSnowballCalculator";
import { debtRowFields } from "./DebtSnowballCalculator.styles";

const outcomes = () => within(screen.getByTestId("debt-snowball-outcomes"));
const toolText = () => screen.getByTestId("debt-snowball-tool").textContent ?? "";
const debtGroup = (name: RegExp) => within(screen.getByRole("group", { name }));
const extraSlider = () => screen.getByLabelText(DEBT_SNOWBALL_COPY.extra);

/** Types into a CurrencyInput or PercentInput and commits it, as a visitor would. */
const enter = (input: HTMLElement, value: string) => {
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value } });
  fireEvent.blur(input);
};

describe("DebtSnowballCalculator", () => {
  it("shows the debt-free date and both methods' totals from the default example", () => {
    render(<DebtSnowballCalculator />);
    const cards = outcomes();
    expect(cards.getByText(DEBT_SNOWBALL_COPY.kpiDate)).toBeDefined();
    // The smallest debt also has the highest rate, so both methods give the same result:
    // 35 months and £1,900.14 of interest from the engine, read in whole pounds.
    expect(cards.getByText(DEBT_SNOWBALL_COPY.dateSame)).toBeDefined();
    expect(cards.getByText(DEBT_SNOWBALL_COPY.kpiAvalanche)).toBeDefined();
    expect(cards.getByText(DEBT_SNOWBALL_COPY.kpiSnowball)).toBeDefined();
    expect(cards.getAllByText("£1,900")).toHaveLength(2);
    expect(cards.getAllByText("Paid off in 2 years 11 months.")).toHaveLength(2);
  });

  it("labels the debts Debt 1 and Debt 2, in sentence case", () => {
    render(<DebtSnowballCalculator />);
    expect(screen.getByRole("group", { name: "Debt 1: credit card" })).toBeDefined();
    expect(screen.getByRole("group", { name: "Debt 2: personal loan" })).toBeDefined();
    expect(toolText()).not.toMatch(/Liability|Credit Card|Personal Loan|surplus|strategy/);
  });

  it("recalculates when the extra payment changes", () => {
    render(<DebtSnowballCalculator />);
    fireEvent.change(extraSlider(), { target: { value: "500" } });
    // 13 months and £597.44 from the engine.
    expect(outcomes().getAllByText("£597")).toHaveLength(2);
    expect(outcomes().getAllByText("Paid off in 13 months.")).toHaveLength(2);
  });

  it("shows each method's own figures with the same fields when they differ", () => {
    render(<DebtSnowballCalculator />);
    // A small, low-rate loan: snowball clears it first, avalanche goes to the card first.
    const loan = debtGroup(/Debt 2/);
    enter(loan.getByLabelText(DEBT_SNOWBALL_COPY.balance), "600");
    enter(loan.getByLabelText(DEBT_SNOWBALL_COPY.rate), "3");
    // Engine: £717.99 highest rate first, £727.88 smallest balance first, both 16 months.
    expect(outcomes().getByText("£718")).toBeDefined();
    expect(outcomes().getByText("£728")).toBeDefined();
    expect(outcomes().getAllByText("Paid off in 16 months.")).toHaveLength(2);
  });

  it("names both dates when the methods finish in different months", () => {
    expect(DEBT_SNOWBALL_COPY.dateBoth("May 2028", "June 2028")).toBe(
      "Highest rate first: May 2028. Smallest balance first: June 2028.",
    );
  });

  it("recalculates when a debt's balance changes and sends the new total", () => {
    const onSave = vi.fn();
    render(<DebtSnowballCalculator onSaveAndContinue={onSave} persistSeed={false} />);
    enter(debtGroup(/Debt 1/).getByLabelText(DEBT_SNOWBALL_COPY.balance), "4000");
    fireEvent.click(screen.getByRole("button", { name: "Continue to sign up" }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ mode: "DEBT", totalUnsecuredDebt: 9000 }),
    );
  });

  it("clamps negative entries to zero before they reach the engine", () => {
    const onSave = vi.fn();
    render(<DebtSnowballCalculator onSaveAndContinue={onSave} persistSeed={false} />);
    const card = debtGroup(/Debt 1/);
    enter(card.getByLabelText(DEBT_SNOWBALL_COPY.balance), "-3500");
    enter(card.getByLabelText(DEBT_SNOWBALL_COPY.rate), "-5");
    expect(toolText()).not.toMatch(/£-|-£|−£/);
    fireEvent.click(screen.getByRole("button", { name: "Continue to sign up" }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ totalUnsecuredDebt: 5000 }));
  });

  it("says plainly when the payments would not pay off the debts", () => {
    render(<DebtSnowballCalculator />);
    const card = debtGroup(/Debt 1/);
    enter(card.getByLabelText(DEBT_SNOWBALL_COPY.minimum), "1");
    enter(card.getByLabelText(DEBT_SNOWBALL_COPY.balance), "900000");
    fireEvent.change(extraSlider(), { target: { value: "0" } });
    expect(outcomes().getAllByText(DEBT_SNOWBALL_COPY.notPaidOff)).toHaveLength(3);
    expect(toolText()).not.toMatch(/Not payable|£1,456/);
  });

  it("adds and removes debts", () => {
    const onSave = vi.fn();
    render(<DebtSnowballCalculator onSaveAndContinue={onSave} persistSeed={false} />);
    fireEvent.click(screen.getByRole("button", { name: DEBT_SNOWBALL_COPY.add }));
    const third = debtGroup(/^Debt 3$/);
    enter(third.getByLabelText(DEBT_SNOWBALL_COPY.balance), "1000");
    enter(third.getByLabelText(DEBT_SNOWBALL_COPY.minimum), "50");
    fireEvent.click(screen.getByRole("button", { name: DEBT_SNOWBALL_COPY.removeLabel(1) }));
    expect(screen.queryByRole("group", { name: /credit card/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Continue to sign up" }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ totalUnsecuredDebt: 6000 }));
  });

  it("moves focus to the new row's balance when a debt is added", () => {
    render(<DebtSnowballCalculator />);
    const add = screen.getByRole("button", { name: DEBT_SNOWBALL_COPY.add });
    add.focus();
    fireEvent.click(add);
    expect(document.activeElement).toBe(
      debtGroup(/^Debt 3$/).getByLabelText(DEBT_SNOWBALL_COPY.balance),
    );
  });

  it("keeps focus on the new field when adding the sixth debt removes the Add button", () => {
    render(<DebtSnowballCalculator />);
    for (let i = 0; i < 4; i++) {
      fireEvent.click(screen.getByRole("button", { name: DEBT_SNOWBALL_COPY.add }));
    }
    expect(screen.queryByRole("button", { name: DEBT_SNOWBALL_COPY.add })).toBeNull();
    expect(document.activeElement).toBe(
      debtGroup(/^Debt 6$/).getByLabelText(DEBT_SNOWBALL_COPY.balance),
    );
  });

  it("moves focus to the previous row's first field when a debt is removed", () => {
    render(<DebtSnowballCalculator />);
    fireEvent.click(screen.getByRole("button", { name: DEBT_SNOWBALL_COPY.add }));
    fireEvent.click(screen.getByRole("button", { name: DEBT_SNOWBALL_COPY.removeLabel(3) }));
    expect(document.activeElement).toBe(
      debtGroup(/^Debt 2/).getByLabelText(DEBT_SNOWBALL_COPY.balance),
    );
  });

  it("moves focus to the new first row when the first debt is removed", () => {
    render(<DebtSnowballCalculator />);
    fireEvent.click(screen.getByRole("button", { name: DEBT_SNOWBALL_COPY.removeLabel(1) }));
    expect(document.activeElement).toBe(
      debtGroup(/^Debt 1: personal loan$/).getByLabelText(DEBT_SNOWBALL_COPY.balance),
    );
  });

  it("says there is no balance to repay when every balance is zero", () => {
    render(<DebtSnowballCalculator />);
    enter(debtGroup(/Debt 1/).getByLabelText(DEBT_SNOWBALL_COPY.balance), "0");
    enter(debtGroup(/Debt 2/).getByLabelText(DEBT_SNOWBALL_COPY.balance), "0");
    expect(outcomes().getByText(DEBT_SNOWBALL_COPY.nothingOwed)).toBeDefined();
    expect(outcomes().getByText(DEBT_SNOWBALL_COPY.nothingOwedDetail)).toBeDefined();
    expect(outcomes().getAllByText(DEBT_SNOWBALL_COPY.nothingOwedInterest)).toHaveLength(2);
    expect(toolText()).not.toMatch(/Paid off in 0|Not paid off/);
  });

  it("keeps at least one debt", () => {
    render(<DebtSnowballCalculator />);
    fireEvent.click(screen.getByRole("button", { name: DEBT_SNOWBALL_COPY.removeLabel(2) }));
    expect(screen.queryByRole("button", { name: /Remove debt/ })).toBeNull();
    expect(screen.getAllByRole("group")).toHaveLength(1);
  });

  it("has one visible slider, no number inputs and exactly one notice", () => {
    const { container } = render(<DebtSnowballCalculator />);
    expect(screen.getAllByRole("slider")).toHaveLength(1);
    expect(container.querySelector('input[type="number"]')).toBeNull();
    expect(screen.getAllByTestId("projection-notice")).toHaveLength(1);
  });

  it("wraps each debt's fields instead of scrolling sideways at 375px (known #10)", () => {
    const classes = debtRowFields().split(" ");
    expect(classes.some((c) => c.includes("auto-fit"))).toBe(true);
    expect(classes.some((c) => /^grid-tc_repeat\(3/.test(c))).toBe(false);
  });

  it("formats payoff durations over 24 months as years and months", () => {
    expect(formatPayoffDuration(1)).toBe("1 month");
    expect(formatPayoffDuration(24)).toBe("24 months");
    expect(formatPayoffDuration(36)).toBe("3 years");
    expect(formatPayoffDuration(37)).toBe("3 years 1 month");
  });

  it("announces both methods with the same fields", () => {
    const result = (date: string, interest: number) =>
      ({ debtFreeDate: date, totalInterest: interest, payoffAchievable: true }) as never;
    expect(
      debtSnowballAnnouncement({
        avalanche: result("May 2028", 1200.4),
        snowball: result("June 2028", 1300),
      }),
    ).toBe(
      "Illustration: highest rate first, estimated debt-free date May 2028, total interest £1,200. Smallest balance first, estimated debt-free date June 2028, total interest £1,300",
    );
  });

  it("shows one arrow on the sign-up button when the caller's label has its own", () => {
    render(<DebtSnowballCalculator ctaText="Request an invite →" />);
    expect(screen.getByRole("button", { name: "Request an invite" })).toBeDefined();
  });

  it("styles come from recipes, with no inline styles or alarm colours", () => {
    const tsx = readFileSync(join(__dirname, "DebtSnowballCalculator.tsx"), "utf8");
    const styles = readFileSync(join(__dirname, "DebtSnowballCalculator.styles.ts"), "utf8");
    expect(tsx).not.toContain("style={{");
    expect(`${tsx}${styles}`).not.toMatch(/status\.(danger|warning)|#[0-9a-f]{3,6}\b/i);
  });
});
