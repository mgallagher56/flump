import { readFileSync } from "node:fs";
import { join } from "node:path";
import { calculateMortgageVsIsa } from "@flump/finance-engine";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MORTGAGE_ISA_COPY, MortgageVsIsaCalculator } from "./MortgageVsIsaCalculator";

const slider = (label: string) => screen.getByLabelText(label);
const pill = (label: string) => screen.getByLabelText(`${label} input`);
const outcomes = () => within(screen.getByTestId("mortgage-isa-outcomes"));
const toolText = () => screen.getByTestId("mortgage-vs-isa-tool").textContent ?? "";
const pounds = (n: number) => `£${Math.round(n).toLocaleString("en-GB")}`;
const openMoreOptions = () =>
  fireEvent.click(screen.getByRole("button", { name: MORTGAGE_ISA_COPY.moreOptions }));

describe("MortgageVsIsaCalculator", () => {
  it("leads with the difference between the two options, then each option, for the defaults", () => {
    render(<MortgageVsIsaCalculator />);
    // £240,000 at 4.5% over 20 years, £350 a month, 7% assumed ISA growth: interest saved
    // £36,349, ISA growth £99,388, so the ISA growth is £63,039 more.
    const res = calculateMortgageVsIsa(240000, 4.5, 20, 350, 7);
    const cards = outcomes();
    expect(cards.getByText(MORTGAGE_ISA_COPY.kpiDifference)).toBeDefined();
    expect(cards.getByText("£63,039")).toBeDefined();
    expect(cards.getByText(MORTGAGE_ISA_COPY.kpiInterestSaved)).toBeDefined();
    expect(cards.getByText(pounds(res.interestSaved))).toBeDefined();
    expect(cards.getByText(MORTGAGE_ISA_COPY.kpiIsaGrowth)).toBeDefined();
    expect(cards.getByText(pounds(res.isaGrowth))).toBeDefined();
    // The amount set aside (input times term) is no longer shown.
    expect(toolText()).not.toContain("£84,000");
  });

  it("writes the time saved in years and months, not a decimal", () => {
    render(<MortgageVsIsaCalculator />);
    fireEvent.click(screen.getByRole("button", { name: MORTGAGE_ISA_COPY.explainerTitle }));
    // 64 months sooner.
    expect(toolText()).toContain("Overpaying pays the mortgage off 5 years 4 months sooner");
    expect(toolText()).not.toMatch(/\d\.\d years/);
  });

  it("keeps the same headline label when the interest saved is more than ISA growth", () => {
    render(<MortgageVsIsaCalculator initialIsaGrowth={0} />);
    // No growth: interest saved £36,349 is the larger, by all of it.
    expect(outcomes().getByText(MORTGAGE_ISA_COPY.kpiDifference)).toBeDefined();
    expect(outcomes().getAllByText("£36,349")).toHaveLength(2);
  });

  it("keeps the same headline label when nothing is overpaid", () => {
    render(<MortgageVsIsaCalculator initialExtra={0} />);
    expect(outcomes().getByText(MORTGAGE_ISA_COPY.kpiDifference)).toBeDefined();
  });

  it("says once, in the headline subtext, that ISA growth can be negative", () => {
    render(<MortgageVsIsaCalculator />);
    fireEvent.click(screen.getByRole("button", { name: MORTGAGE_ISA_COPY.explainerTitle }));
    expect(MORTGAGE_ISA_COPY.kpiDifferenceSubtext).toContain("can be negative");
    expect(toolText().match(/ISA growth is not fixed and can be negative/g)).toHaveLength(1);
  });

  it("recalculates when the extra money a month changes", () => {
    render(<MortgageVsIsaCalculator />);
    fireEvent.change(slider(MORTGAGE_ISA_COPY.extra), { target: { value: "500" } });
    const res = calculateMortgageVsIsa(240000, 4.5, 20, 500, 7);
    expect(outcomes().getByText(pounds(res.netWealthDelta))).toBeDefined();
    expect(outcomes().getByText(pounds(res.interestSaved))).toBeDefined();
  });

  it("keeps figures out of the card labels and captions", () => {
    for (const w of [
      MORTGAGE_ISA_COPY.kpiDifference,
      MORTGAGE_ISA_COPY.kpiDifferenceSubtext,
      MORTGAGE_ISA_COPY.kpiInterestSaved,
      MORTGAGE_ISA_COPY.kpiInterestSavedSubtext,
      MORTGAGE_ISA_COPY.kpiIsaGrowth,
      MORTGAGE_ISA_COPY.kpiIsaGrowthSubtext,
    ]) {
      expect(w).not.toMatch(/[0-9£%]/);
    }
  });

  it("puts the sign-up button under the result, before the explainer and notice", () => {
    render(<MortgageVsIsaCalculator />);
    const button = screen.getByRole("button", { name: "Continue to sign up" });
    const cards = screen.getByTestId("mortgage-isa-outcomes");
    const notice = screen.getByTestId("projection-notice");
    expect(cards.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(button.compareDocumentPosition(notice) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("hides its own title and intro when embedded, with no skipped heading level", () => {
    render(<MortgageVsIsaCalculator embedded />);
    expect(screen.queryByText(MORTGAGE_ISA_COPY.title)).toBeNull();
    expect(screen.queryByText(MORTGAGE_ISA_COPY.intro)).toBeNull();
    const levels = Array.from(
      screen.getByTestId("mortgage-vs-isa-tool").querySelectorAll("h1, h2, h3, h4, h5, h6"),
    ).map((h) => Number(h.tagName.slice(1)));
    // The explainer is a closed drawer now, so the embedded body may hold no heading at all.
    if (levels.length > 0) expect(levels[0]).toBe(2);
    for (let i = 1; i < levels.length; i++) {
      expect((levels[i] ?? 0) - (levels[i - 1] ?? 0)).toBeLessThanOrEqual(1);
    }
  });

  it("shows its title as h2 when not embedded, and the working in a closed drawer", () => {
    render(<MortgageVsIsaCalculator />);
    expect(screen.getByRole("heading", { level: 2, name: MORTGAGE_ISA_COPY.title })).toBeDefined();
    const drawer = screen.getByRole("button", { name: MORTGAGE_ISA_COPY.explainerTitle });
    expect(drawer.getAttribute("aria-expanded")).toBe("false");
  });

  it("uses the years left the user sets under More options (default 20)", () => {
    render(<MortgageVsIsaCalculator />);
    openMoreOptions();
    expect((slider(MORTGAGE_ISA_COPY.term) as HTMLInputElement).value).toBe("20");
    fireEvent.change(slider(MORTGAGE_ISA_COPY.term), { target: { value: "10" } });
    const res = calculateMortgageVsIsa(240000, 4.5, 10, 350, 7);
    expect(outcomes().getByText(pounds(res.isaGrowth))).toBeDefined();
  });

  it("uses the assumed ISA growth set under More options", () => {
    render(<MortgageVsIsaCalculator />);
    openMoreOptions();
    fireEvent.change(slider(MORTGAGE_ISA_COPY.isaGrowth), { target: { value: "0" } });
    // No growth: the ISA adds nothing to the money paid in.
    expect(outcomes().getByText("£0")).toBeDefined();
    expect(outcomes().getByText(MORTGAGE_ISA_COPY.kpiDifference)).toBeDefined();
  });

  it("never passes a negative entry to the engine", () => {
    render(<MortgageVsIsaCalculator initialBalance={-5000} initialExtra={-10} />);
    fireEvent.focus(pill(MORTGAGE_ISA_COPY.rate));
    fireEvent.change(pill(MORTGAGE_ISA_COPY.rate), { target: { value: "-3" } });
    fireEvent.blur(pill(MORTGAGE_ISA_COPY.rate));
    expect(toolText()).not.toMatch(/£-|-£|−£/);
  });

  it("shows a neutral subtext, not years sooner, when nothing is overpaid", () => {
    const { unmount } = render(<MortgageVsIsaCalculator initialExtra={0} />);
    expect(screen.getByText(MORTGAGE_ISA_COPY.kpiInterestSavedNoExtra)).toBeDefined();
    expect(screen.queryByText(/years sooner/)).toBeNull();
    unmount();
    render(<MortgageVsIsaCalculator initialBalance={0} />);
    expect(screen.getByText(MORTGAGE_ISA_COPY.kpiInterestSavedNoBalance)).toBeDefined();
    expect(screen.queryByText(/years sooner/)).toBeNull();
  });

  it("keeps the years left between 1 and 40", () => {
    render(<MortgageVsIsaCalculator initialTermYears={0} />);
    const res = calculateMortgageVsIsa(240000, 4.5, 1, 350, 7);
    expect(outcomes().getByText(pounds(res.isaGrowth))).toBeDefined();
    openMoreOptions();
    expect((slider(MORTGAGE_ISA_COPY.term) as HTMLInputElement).value).toBe("1");
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
