import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OVERDRAFT_COPY, OverdraftCostCalculator } from "./OverdraftCostCalculator";

const balanceSlider = () => screen.getByLabelText(OVERDRAFT_COPY.balance);
const rateSlider = () => screen.getByLabelText(OVERDRAFT_COPY.rate);
const ratePill = () => screen.getByLabelText(`${OVERDRAFT_COPY.rate} input`);
const outcomes = () => screen.getByTestId("overdraft-outcomes");
const toolText = () => screen.getByTestId("overdraft-cost-tool").textContent ?? "";

describe("OverdraftCostCalculator", () => {
  it("shows one outcome and one supporting figure from the default example", () => {
    render(<OverdraftCostCalculator />);
    const cards = within(outcomes());
    // £1,200 at 39.9% EAR: £478.80 a year, £39.90 a month, read in whole pounds.
    expect(cards.getByText(OVERDRAFT_COPY.kpiYear)).toBeDefined();
    expect(cards.getByText("£479")).toBeDefined();
    expect(cards.getByText(OVERDRAFT_COPY.kpiMonth)).toBeDefined();
    expect(cards.getByText("£40")).toBeDefined();
  });

  it("recalculates when the balance changes", () => {
    render(<OverdraftCostCalculator />);
    fireEvent.change(balanceSlider(), { target: { value: "2000" } });
    expect(within(outcomes()).getByText("£798")).toBeDefined();
    fireEvent.change(balanceSlider(), { target: { value: "0" } });
    expect(within(outcomes()).getAllByText("£0")).toHaveLength(2);
  });

  it("recalculates when the rate changes", () => {
    render(<OverdraftCostCalculator />);
    fireEvent.change(rateSlider(), { target: { value: "25" } });
    // £1,200 at 25%: £300 a year.
    expect(within(outcomes()).getByText("£300")).toBeDefined();
  });

  it("never shows a negative cost for a negative rate entry", () => {
    render(<OverdraftCostCalculator initialRate={-5} />);
    expect(toolText()).not.toMatch(/£-|-£|−£/);
    fireEvent.focus(ratePill());
    fireEvent.change(ratePill(), { target: { value: "-5" } });
    fireEvent.blur(ratePill());
    expect(toolText()).not.toMatch(/£-|-£|−£/);
    expect(within(outcomes()).getAllByText("£0")).toHaveLength(2);
  });

  it("shows one arrow on the sign-up button when the caller's label has its own", () => {
    render(<OverdraftCostCalculator ctaText="Request an invite →" />);
    expect(screen.getByRole("button", { name: "Request an invite" })).toBeDefined();
  });

  it("has three visible inputs at most and exactly one notice", () => {
    render(<OverdraftCostCalculator />);
    expect(screen.getAllByRole("slider").length).toBeLessThanOrEqual(3);
    expect(screen.getAllByTestId("projection-notice")).toHaveLength(1);
  });

  it("uses factual copy with no fixed example figures or alarm words", () => {
    render(<OverdraftCostCalculator initialBalance={500} initialRate={35} />);
    const text = toolText();
    expect(text).toContain(OVERDRAFT_COPY.explainer);
    expect(text).not.toMatch(/£1,200|39\.9|guaranteed|dangerous|stealth|checking|\/month|\/ year/i);
  });

  it("calls onSaveAndContinue with the entered balance", () => {
    const onSave = vi.fn();
    render(<OverdraftCostCalculator onSaveAndContinue={onSave} />);
    fireEvent.change(balanceSlider(), { target: { value: "800" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue to sign up" }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ mode: "DEBT", totalUnsecuredDebt: 800 }),
    );
  });

  it("styles come from recipes, with no inline styles or alarm colours", () => {
    const tsx = readFileSync(join(__dirname, "OverdraftCostCalculator.tsx"), "utf8");
    const styles = readFileSync(join(__dirname, "OverdraftCostCalculator.styles.ts"), "utf8");
    expect(tsx).not.toContain("style={{");
    expect(`${tsx}${styles}`).not.toMatch(/status\.(danger|warning)|#[0-9a-f]{3,6}\b/i);
  });
});
