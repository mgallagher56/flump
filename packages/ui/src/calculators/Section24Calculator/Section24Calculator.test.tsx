import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DELTA_PANEL_COPY } from "../../patterns/TakeHomeDeltaPanel/copy";
import { SECTION24_COPY, Section24Calculator } from "./Section24Calculator";

const slider = (label: string) => screen.getByLabelText(label);
const pill = (label: string) => screen.getByLabelText(`${label} input`);
const outcomes = () => within(screen.getByTestId("section-24-outcomes"));
const toolText = () => screen.getByTestId("section-24-tool").textContent ?? "";
const openMoreOptions = () =>
  fireEvent.click(screen.getByRole("button", { name: new RegExp(SECTION24_COPY.moreOptions) }));

describe("Section24Calculator", () => {
  it("shows the engine's tax, cash left and rate for the default example", () => {
    render(<Section24Calculator />);
    // £18,000 rent, £2,000 costs, £8,000 interest, £60,000 other income: £16,000 taxable at 40%
    // is £6,400, minus a £1,600 credit, so £4,800 tax; £8,000 cash profit leaves £3,200.
    const cards = outcomes();
    expect(cards.getByText(SECTION24_COPY.kpiTax)).toBeDefined();
    expect(cards.getByText("£4,800")).toBeDefined();
    expect(cards.getByText(SECTION24_COPY.kpiTaxSubtext)).toBeDefined();
    expect(cards.getByText("£3,200")).toBeDefined();
  });

  it("keeps figures out of the captions (no £6,400, £1,600, £267 or £16,000)", () => {
    render(<Section24Calculator />);
    const text = toolText();
    expect(text).not.toMatch(/£6,400|£1,600|£267|£16,000/);
    for (const w of [
      SECTION24_COPY.kpiTaxSubtext,
      SECTION24_COPY.kpiCashSubtext,
      SECTION24_COPY.kpiRateSubtext,
    ]) {
      expect(w).not.toMatch(/[0-9£%]/);
    }
  });

  it("shows a cash loss after tax with a minus sign and no alarm colour", () => {
    // £18,000 rent, £2,000 costs, £13,000 interest: £3,800 tax, so £3,000 cash before tax
    // becomes a £800 loss after it.
    render(<Section24Calculator initialMortgageInterest={13_000} />);
    const cash = outcomes().getByText("-£800");
    expect(cash).toBeDefined();
    expect(screen.getByText("minus £800")).toBeDefined();
    expect(cash.closest("[class]")?.className ?? "").not.toMatch(/danger|negative|red/);
  });

  it("labels the rate against taxable profit, matching the engine (£4,800 of £16,000 = 30%)", () => {
    render(<Section24Calculator />);
    const text = toolText();
    expect(text).toContain(SECTION24_COPY.kpiRate);
    expect(text).toContain("30%");
    expect(text).not.toContain("30.0%");
    expect(text).toContain(SECTION24_COPY.kpiRateSubtext);
    expect(text).not.toMatch(/real cash profit/);
  });

  it("recalculates when the rent changes", () => {
    render(<Section24Calculator />);
    fireEvent.change(slider(SECTION24_COPY.rentalIncome), { target: { value: "30000" } });
    // £28,000 taxable: £11,200 less £1,600 credit.
    expect(outcomes().getByText("£9,600")).toBeDefined();
  });

  it("keeps other allowable costs under More options, and they change the figures", () => {
    render(<Section24Calculator />);
    expect(screen.getAllByRole("slider")).toHaveLength(3);
    openMoreOptions();
    fireEvent.change(slider(SECTION24_COPY.allowableExpenses), { target: { value: "4000" } });
    // £14,000 taxable: £5,600 less £1,600 credit.
    expect(outcomes().getByText("£4,000")).toBeDefined();
  });

  it("never passes a negative entry to the engine", () => {
    render(<Section24Calculator initialMortgageInterest={-5000} />);
    // Interest clamped to £0: £16,000 taxable at 40% is £6,400 tax, no credit.
    expect(outcomes().getByText("£6,400")).toBeDefined();
    expect(toolText()).not.toMatch(/£-|-£|−£/);
    fireEvent.focus(pill(SECTION24_COPY.rentalIncome));
    fireEvent.change(pill(SECTION24_COPY.rentalIncome), { target: { value: "-100" } });
    fireEvent.blur(pill(SECTION24_COPY.rentalIncome));
    // Rent clamped to £0: no tax, and the £2,000 of costs is a cash loss (not -£100 of rent).
    expect((pill(SECTION24_COPY.rentalIncome) as HTMLInputElement).value).not.toContain("-");
    expect(outcomes().getAllByText("£0").length).toBeGreaterThan(0);
    expect(outcomes().getByText("-£2,000")).toBeDefined();
  });

  it("has three visible inputs and exactly one notice, with no badge repeating it", () => {
    render(<Section24Calculator />);
    expect(screen.getAllByRole("slider").length).toBeLessThanOrEqual(3);
    expect(screen.getAllByTestId("projection-notice")).toHaveLength(1);
    expect(screen.queryByTestId("tax-rates-status-banner")).toBeNull();
    expect(screen.queryByText("Unverified estimate")).toBeNull();
  });

  it("leads the one notice with the full unverified estimate sentence", () => {
    render(<Section24Calculator />);
    const notice = screen.getByTestId("projection-notice");
    expect(notice.textContent?.startsWith(DELTA_PANEL_COPY.unverifiedBanner)).toBe(true);
  });

  it("puts the sign-up button under the result, before the explainer and notice", () => {
    render(<Section24Calculator />);
    const button = screen.getByRole("button", { name: "Continue to sign up" });
    const cards = screen.getByTestId("section-24-outcomes");
    const notice = screen.getByTestId("projection-notice");
    expect(cards.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(button.compareDocumentPosition(notice) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("hides its own title and intro when embedded, and skips no heading level", () => {
    render(<Section24Calculator embedded />);
    expect(screen.queryByText(SECTION24_COPY.title)).toBeNull();
    expect(screen.queryByText(SECTION24_COPY.intro)).toBeNull();
    const levels = Array.from(
      screen.getByTestId("section-24-tool").querySelectorAll("h1, h2, h3, h4, h5, h6"),
    ).map((h) => Number(h.tagName.slice(1)));
    // The explainer is a drawer, not a heading; any heading left must start at h2.
    expect(levels.length === 0 || levels[0] === 2).toBe(true);
    for (let i = 1; i < levels.length; i++) {
      expect((levels[i] ?? 0) - (levels[i - 1] ?? 0)).toBeLessThanOrEqual(1);
    }
  });

  it("shows its title as h2 and section headings as h3 when not embedded", () => {
    render(<Section24Calculator />);
    expect(screen.getByRole("heading", { level: 2, name: SECTION24_COPY.title })).toBeDefined();
    // The explainer sits in a quiet drawer, closed by default, so its figures stay out of view.
    const explainer = screen.getByRole("button", { name: SECTION24_COPY.explainerTitle });
    expect(explainer.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText(SECTION24_COPY.explainer)).toBeNull();
    fireEvent.click(explainer);
    expect(screen.getByText(SECTION24_COPY.explainer)).toBeDefined();
  });

  it("claims no automation or HMRC filing", () => {
    render(<Section24Calculator />);
    fireEvent.click(screen.getByRole("button", { name: SECTION24_COPY.explainerTitle }));
    const text = toolText();
    expect(text).not.toMatch(/automat|HMRC tax due|HMRC landlord|free|\/ yr|\/mo|&/i);
    expect(text).toContain("Flump does not file your tax return.");
  });

  it("calls onSaveAndContinue with the unchanged seed shape", () => {
    const onSave = vi.fn();
    render(<Section24Calculator onSaveAndContinue={onSave} />);
    fireEvent.change(slider(SECTION24_COPY.otherIncome), { target: { value: "45000" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue to sign up" }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        annualIncome: 45000,
        inferredModules: ["tax", "mortgage", "forecast"],
      }),
    );
  });

  it("shows one arrow on the sign-up button when the caller's label has its own", () => {
    render(<Section24Calculator ctaText="Request an invite →" />);
    expect(screen.getByRole("button", { name: "Request an invite" })).toBeDefined();
  });

  it("styles come from recipes, with no inline styles or alarm colours", () => {
    const tsx = readFileSync(join(__dirname, "Section24Calculator.tsx"), "utf8");
    const styles = readFileSync(join(__dirname, "Section24Calculator.styles.ts"), "utf8");
    expect(tsx).not.toContain("style={{");
    expect(tsx).not.toContain('type="number"');
    expect(`${tsx}${styles}`).not.toMatch(/status\.(danger|warning)|#[0-9a-f]{3,6}\b/i);
  });
});
