import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SECTION24_COPY, Section24Calculator } from "./Section24Calculator";

const slider = (label: string) => screen.getByLabelText(`${label} range slider`);
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
    expect(
      cards.getByText("£6,400 tax before the credit, minus a £1,600 credit for mortgage interest"),
    ).toBeDefined();
    expect(cards.getByText("£3,200")).toBeDefined();
    expect(cards.getByText("£267 a month")).toBeDefined();
  });

  it("labels the rate against taxable profit, matching the engine (£4,800 of £16,000 = 30%)", () => {
    render(<Section24Calculator />);
    const text = toolText();
    expect(text).toContain(SECTION24_COPY.kpiRate);
    expect(text).toContain("30.0%");
    expect(text).toContain("Of £16,000 taxable rental profit");
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
    expect(toolText()).not.toMatch(/£-|-£|−£/);
    fireEvent.focus(pill(SECTION24_COPY.rentalIncome));
    fireEvent.change(pill(SECTION24_COPY.rentalIncome), { target: { value: "-100" } });
    fireEvent.blur(pill(SECTION24_COPY.rentalIncome));
    expect(toolText()).not.toMatch(/£-|-£|−£/);
    expect(outcomes().getAllByText("£0").length).toBeGreaterThan(0);
  });

  it("has three visible inputs and exactly one notice, and says the tax is unverified", () => {
    render(<Section24Calculator />);
    expect(screen.getAllByRole("slider").length).toBeLessThanOrEqual(3);
    expect(screen.getAllByTestId("projection-notice")).toHaveLength(1);
    expect(screen.queryByTestId("tax-rates-status-banner")).toBeNull();
    expect(screen.getAllByText(SECTION24_COPY.unverifiedBadge)).toHaveLength(1);
  });

  it("claims no automation or HMRC filing", () => {
    render(<Section24Calculator />);
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
