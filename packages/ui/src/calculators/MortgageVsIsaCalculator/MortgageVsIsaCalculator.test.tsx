import { readFileSync } from "node:fs";
import { join } from "node:path";
import { calculateMortgageVsIsa } from "@flump/finance-engine";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MORTGAGE_ISA_COPY, MortgageVsIsaCalculator } from "./MortgageVsIsaCalculator";

const slider = (label: string) => screen.getByLabelText(`${label} range slider`);
const pill = (label: string) => screen.getByLabelText(`${label} input`);
const outcomes = () => within(screen.getByTestId("mortgage-isa-outcomes"));
const toolText = () => screen.getByTestId("mortgage-vs-isa-tool").textContent ?? "";
const pounds = (n: number) => `£${Math.round(n).toLocaleString("en-GB")}`;
const openMoreOptions = () =>
  fireEvent.click(screen.getByRole("button", { name: MORTGAGE_ISA_COPY.moreOptions }));

describe("MortgageVsIsaCalculator", () => {
  it("shows the amount set aside and both options from the engine for the defaults", () => {
    render(<MortgageVsIsaCalculator />);
    // £240,000 at 4.5% over 20 years, £350 a month, 7% assumed ISA growth.
    const res = calculateMortgageVsIsa(240000, 4.5, 20, 350, 7);
    const cards = outcomes();
    expect(cards.getByText(MORTGAGE_ISA_COPY.kpiSetAside(20))).toBeDefined();
    expect(cards.getByText("£84,000")).toBeDefined();
    expect(cards.getByText(MORTGAGE_ISA_COPY.kpiInterestSaved)).toBeDefined();
    expect(cards.getByText(pounds(res.interestSaved))).toBeDefined();
    expect(cards.getByText(MORTGAGE_ISA_COPY.kpiIsaBalance)).toBeDefined();
    expect(cards.getByText(pounds(res.isaAccumulatedValue))).toBeDefined();
    expect(toolText()).toContain("about 5.3 years sooner");
  });

  it("recalculates when the extra money a month changes", () => {
    render(<MortgageVsIsaCalculator />);
    fireEvent.change(slider(MORTGAGE_ISA_COPY.extra), { target: { value: "500" } });
    const res = calculateMortgageVsIsa(240000, 4.5, 20, 500, 7);
    expect(outcomes().getByText("£120,000")).toBeDefined();
    expect(outcomes().getByText(pounds(res.interestSaved))).toBeDefined();
  });

  it("uses the years left the user sets under More options (default 20)", () => {
    render(<MortgageVsIsaCalculator />);
    openMoreOptions();
    expect((slider(MORTGAGE_ISA_COPY.term) as HTMLInputElement).value).toBe("20");
    fireEvent.change(slider(MORTGAGE_ISA_COPY.term), { target: { value: "10" } });
    const res = calculateMortgageVsIsa(240000, 4.5, 10, 350, 7);
    expect(outcomes().getByText(MORTGAGE_ISA_COPY.kpiSetAside(10))).toBeDefined();
    expect(outcomes().getByText(pounds(res.isaAccumulatedValue))).toBeDefined();
  });

  it("uses the assumed ISA growth set under More options", () => {
    render(<MortgageVsIsaCalculator />);
    openMoreOptions();
    fireEvent.change(slider(MORTGAGE_ISA_COPY.isaGrowth), { target: { value: "0" } });
    // No growth: the ISA balance equals the money paid in.
    expect(outcomes().getAllByText("£84,000")).toHaveLength(2);
  });

  it("never passes a negative entry to the engine", () => {
    render(<MortgageVsIsaCalculator initialBalance={-5000} initialExtra={-10} />);
    fireEvent.focus(pill(MORTGAGE_ISA_COPY.rate));
    fireEvent.change(pill(MORTGAGE_ISA_COPY.rate), { target: { value: "-3" } });
    fireEvent.blur(pill(MORTGAGE_ISA_COPY.rate));
    expect(toolText()).not.toMatch(/£-|-£|−£/);
  });

  it("keeps the years left between 1 and 40", () => {
    render(<MortgageVsIsaCalculator initialTermYears={0} />);
    expect(outcomes().getByText(MORTGAGE_ISA_COPY.kpiSetAside(1))).toBeDefined();
  });

  it("has three visible inputs at most, the rest under More options, and exactly one notice", () => {
    render(<MortgageVsIsaCalculator />);
    expect(screen.getAllByRole("slider")).toHaveLength(3);
    openMoreOptions();
    expect(screen.getAllByRole("slider")).toHaveLength(5);
    expect(screen.getAllByTestId("projection-notice")).toHaveLength(1);
  });

  it("uses neutral copy that ranks neither option and claims nothing Flump lacks", () => {
    render(<MortgageVsIsaCalculator />);
    expect(toolText()).toContain(MORTGAGE_ISA_COPY.intro);
    expect(toolText()).not.toMatch(
      /guaranteed|syncs?|monitors?|\blive\b|engine|mathematically|better|winner|\bSave £|\/mo/i,
    );
  });

  it("shows one arrow on the sign-up button when the caller's label has its own", () => {
    render(<MortgageVsIsaCalculator ctaText="Request an invite →" />);
    expect(screen.getByRole("button", { name: "Request an invite" })).toBeDefined();
  });

  it("calls onSaveAndContinue with the seed shape", () => {
    const onSave = vi.fn();
    render(<MortgageVsIsaCalculator onSaveAndContinue={onSave} persistSeed={false} />);
    fireEvent.change(slider(MORTGAGE_ISA_COPY.balance), { target: { value: "300000" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue to sign up" }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        annualIncome: 75000,
        mortgageBalance: 300000,
        monthlyContribution: 350,
        inferredModules: ["mortgage", "accounts", "forecast"],
      }),
    );
  });

  it("styles come from recipes, with no inline styles or alarm colours", () => {
    const tsx = readFileSync(join(__dirname, "MortgageVsIsaCalculator.tsx"), "utf8");
    const styles = readFileSync(join(__dirname, "MortgageVsIsaCalculator.styles.ts"), "utf8");
    expect(tsx).not.toContain("style={{");
    expect(`${tsx}${styles}`).not.toMatch(/status\.(danger|warning|positive)|#[0-9a-f]{3,6}\b/i);
  });
});
