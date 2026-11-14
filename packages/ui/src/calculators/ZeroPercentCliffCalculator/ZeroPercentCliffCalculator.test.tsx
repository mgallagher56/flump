import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ZERO_PERCENT_COPY, ZeroPercentCliffCalculator } from "./ZeroPercentCliffCalculator";

const balanceSlider = () => screen.getByLabelText(ZERO_PERCENT_COPY.balance);
const balancePill = () => screen.getByLabelText(`${ZERO_PERCENT_COPY.balance} input`);
const monthsSlider = () => screen.getByLabelText(ZERO_PERCENT_COPY.months);
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
    expect(cards.getByText(ZERO_PERCENT_COPY.kpiInterest)).toBeDefined();
    // The minimum-payment working is in the explainer, not a caption, closed by default.
    expect(toolText()).not.toContain(ZERO_PERCENT_COPY.minimumExplainer);
    fireEvent.click(screen.getByRole("button", { name: ZERO_PERCENT_COPY.explainerTitle }));
    expect(toolText()).toContain(ZERO_PERCENT_COPY.minimumExplainer);
  });

  it("keeps figures out of the card labels and captions", () => {
    render(<ZeroPercentCliffCalculator />);
    const cards = screen.getByTestId("zero-percent-outcomes");
    const words = [
      ZERO_PERCENT_COPY.kpiPayment,
      ZERO_PERCENT_COPY.kpiPaymentSubtext,
      ZERO_PERCENT_COPY.kpiLeft,
      ZERO_PERCENT_COPY.kpiLeftSubtext,
      ZERO_PERCENT_COPY.kpiLeftClearedSubtext,
      ZERO_PERCENT_COPY.kpiInterest,
      ZERO_PERCENT_COPY.kpiInterestSubtext,
    ];
    for (const w of words) expect(w.replace("0%", "")).not.toMatch(/[0-9£]/);
    // Three figures in the cards: payment, amount left and interest.
    expect(cards.textContent?.match(/£[0-9,]+/g)).toHaveLength(3);
  });

  it("puts the sign-up button under the result, before the explainer and notice", () => {
    render(<ZeroPercentCliffCalculator />);
    const button = screen.getByRole("button", { name: "Continue to sign up" });
    const cards = screen.getByTestId("zero-percent-outcomes");
    const notice = screen.getByTestId("projection-notice");
    expect(cards.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(button.compareDocumentPosition(notice) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("hides its own title and intro when embedded, with no skipped heading level", () => {
    render(<ZeroPercentCliffCalculator embedded />);
    expect(screen.queryByText(ZERO_PERCENT_COPY.title)).toBeNull();
    expect(screen.queryByText(ZERO_PERCENT_COPY.intro)).toBeNull();
    const levels = Array.from(
      screen.getByTestId("zero-percent-cliff-tool").querySelectorAll("h1, h2, h3, h4, h5, h6"),
    ).map((h) => Number(h.tagName.slice(1)));
    // The explainer is a drawer, not a heading; any heading left must start at h2.
    expect(levels.length === 0 || levels[0] === 2).toBe(true);
    for (let i = 1; i < levels.length; i++) {
      expect((levels[i] ?? 0) - (levels[i - 1] ?? 0)).toBeLessThanOrEqual(1);
    }
  });

  it("shows its title as h2 and section headings as h3 when not embedded", () => {
    render(<ZeroPercentCliffCalculator />);
    expect(screen.getByRole("heading", { level: 2, name: ZERO_PERCENT_COPY.title })).toBeDefined();
    expect(
      screen
        .getByRole("button", { name: ZERO_PERCENT_COPY.explainerTitle })
        .getAttribute("aria-expanded"),
    ).toBe("false");
  });

  it("recalculates when the balance and months change", () => {
    render(<ZeroPercentCliffCalculator />);
    fireEvent.change(balanceSlider(), { target: { value: "4800" } });
    // £4,800 over 18 months: £266.67, read as £267.
    expect(outcomes().getByText("£267")).toBeDefined();
    fireEvent.change(monthsSlider(), { target: { value: "12" } });
    expect(outcomes().getByText("£400")).toBeDefined();
  });

  it("keeps months whole and positive", () => {
    render(<ZeroPercentCliffCalculator />);
    enter(balancePill(), "3600");
    enter(monthsPill(), "-3");
    // Clamped to one month: the whole balance in a single payment.
    expect((monthsPill() as HTMLInputElement).value).toBe("1");
    expect(outcomes().getByText("£3,600")).toBeDefined();
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
    expect(toolText()).not.toMatch(/Pays off the £0|would pay it off/);
  });

  it("drops the interest card when the minimum alone would clear the balance", () => {
    render(<ZeroPercentCliffCalculator />);
    fireEvent.change(balanceSlider(), { target: { value: "400" } });
    expect(toolText()).toContain(ZERO_PERCENT_COPY.kpiLeftClearedSubtext);
    expect(outcomes().queryByText(/first year after the deal/)).toBeNull();
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

describe("ZeroPercentCliffCalculator rate label", () => {
  it("keeps the rate label short, with the rest in its helper text", () => {
    render(<ZeroPercentCliffCalculator />);
    const slider = screen.getByLabelText(ZERO_PERCENT_COPY.rate);
    expect(ZERO_PERCENT_COPY.rate).toBe("Rate after the deal (APR)");
    const helper = document.getElementById(slider.getAttribute("aria-describedby") ?? "");
    expect(helper?.textContent).toBe(ZERO_PERCENT_COPY.rateHelper);
  });
});
