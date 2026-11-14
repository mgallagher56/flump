import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ZERO_PERCENT_COPY, ZeroPercentCliffCalculator } from "./ZeroPercentCliffCalculator";

const balanceSlider = () => screen.getByLabelText(`${ZERO_PERCENT_COPY.balance} range slider`);
const balancePill = () => screen.getByLabelText(`${ZERO_PERCENT_COPY.balance} input`);
const monthsSlider = () => screen.getByLabelText(`${ZERO_PERCENT_COPY.months} range slider`);
const monthsPill = () => screen.getByLabelText(`${ZERO_PERCENT_COPY.months} input`);
const ratePill = () => screen.getByLabelText(`${ZERO_PERCENT_COPY.rate} input`);
const outcomes = () => within(screen.getByTestId("zero-percent-outcomes"));
const toolText = () => screen.getByTestId("zero-percent-cliff-tool").textContent ?? "";

const enter = (input: HTMLElement, value: string) => {
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value } });
  fireEvent.blur(input);
};

describe("ZeroPercentCliffCalculator", () => {
  it("shows the monthly payment and what minimums would leave, from the engine", () => {
    render(<ZeroPercentCliffCalculator />);
    const cards = outcomes();
    // calculateZeroPercentCliff(3600, 18, 24.9): £200 a month; a £72 minimum leaves £2,304;
    // £573.70 of interest in the year after, read in whole pounds.
    expect(cards.getByText(ZERO_PERCENT_COPY.kpiPayment)).toBeDefined();
    expect(cards.getByText("£200")).toBeDefined();
    expect(cards.getByText("£2,304")).toBeDefined();
    expect(cards.getByText("£574")).toBeDefined();
    expect(cards.getByText("Interest in the first year after, at 24.9% APR")).toBeDefined();
    expect(toolText()).toContain("2% of today's balance (at least £25)");
    expect(toolText()).toContain("Pays off the £3,600 balance in 18 months");
  });

  it("recalculates when the balance and months change", () => {
    render(<ZeroPercentCliffCalculator />);
    fireEvent.change(balanceSlider(), { target: { value: "4800" } });
    // £4,800 over 18 months: £266.67, read as £267.
    expect(outcomes().getByText("£267")).toBeDefined();
    fireEvent.change(monthsSlider(), { target: { value: "12" } });
    expect(outcomes().getByText("£400")).toBeDefined();
  });

  it("formats a pence balance as currency and keeps months whole and positive", () => {
    render(<ZeroPercentCliffCalculator />);
    enter(balancePill(), "3600.50");
    enter(monthsPill(), "-3");
    const text = toolText();
    expect(text).toContain("£3,600.50 balance in 1 month,");
    expect(text).not.toMatch(/-3 months|0 months/);
  });

  it("never shows a negative figure for negative entries", () => {
    render(<ZeroPercentCliffCalculator initialBalance={-100} initialRate={-5} />);
    enter(ratePill(), "-5");
    expect(toolText()).not.toMatch(/£-|-£|−£|-5%/);
  });

  it("says there is no balance to repay when the balance is zero", () => {
    render(<ZeroPercentCliffCalculator />);
    fireEvent.change(balanceSlider(), { target: { value: "0" } });
    expect(outcomes().getByText(ZERO_PERCENT_COPY.nothingOwed)).toBeDefined();
    expect(outcomes().getByText(ZERO_PERCENT_COPY.nothingOwedSubtext)).toBeDefined();
    expect(outcomes().getByText(ZERO_PERCENT_COPY.kpiLeftNothingOwedSubtext)).toBeDefined();
    expect(toolText()).not.toMatch(/Pays off the £0|would clear it/);
  });

  it("drops the interest card when the minimum alone would clear the balance", () => {
    render(<ZeroPercentCliffCalculator />);
    fireEvent.change(balanceSlider(), { target: { value: "400" } });
    expect(toolText()).toContain(ZERO_PERCENT_COPY.kpiLeftClearedSubtext);
    expect(outcomes().queryByText(/Interest in the first year after/)).toBeNull();
  });

  it("states the result as a neutral estimate, with no instruction or alarm wording", () => {
    render(<ZeroPercentCliffCalculator />);
    expect(toolText()).not.toMatch(/exact|you will|alert|target|~|promotional|revert|\/ month/i);
  });

  it("has three visible inputs at most and exactly one notice", () => {
    render(<ZeroPercentCliffCalculator />);
    expect(screen.getAllByRole("slider").length).toBeLessThanOrEqual(3);
    expect(screen.getAllByTestId("projection-notice")).toHaveLength(1);
  });

  it("calls onSaveAndContinue with the entered balance", () => {
    const onSave = vi.fn();
    render(<ZeroPercentCliffCalculator onSaveAndContinue={onSave} persistSeed={false} />);
    fireEvent.change(balanceSlider(), { target: { value: "5000" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue to sign up" }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ mode: "DEBT", totalUnsecuredDebt: 5000 }),
    );
  });

  it("shows one arrow on the sign-up button when the caller's label has its own", () => {
    render(<ZeroPercentCliffCalculator ctaText="Request an invite →" />);
    expect(screen.getByRole("button", { name: "Request an invite" })).toBeDefined();
  });

  it("styles come from recipes, with no inline styles, alarm colours or warning icons", () => {
    const tsx = readFileSync(join(__dirname, "ZeroPercentCliffCalculator.tsx"), "utf8");
    const styles = readFileSync(join(__dirname, "ZeroPercentCliffCalculator.styles.ts"), "utf8");
    expect(tsx).not.toContain("style={{");
    expect(tsx).not.toMatch(/react-icons|Triangle/);
    expect(`${tsx}${styles}`).not.toMatch(/status\.(danger|warning)|#[0-9a-f]{3,6}\b/i);
  });
});
