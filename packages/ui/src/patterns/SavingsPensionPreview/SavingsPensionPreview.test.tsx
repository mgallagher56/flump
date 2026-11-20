import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SavingsPensionPreview } from "./SavingsPensionPreview";

// Worked by hand from the sample households (packages/finance-engine/src/sample-households.ts and
// the persona fixtures under src/picture/__fixtures__/personas). No account stores a monthly
// saving, so 12 months of interest at an AER is balance x AER.
//
// renter (sam.ts, employer rate 3% from SAMPLE_HOUSEHOLDS):
//   savings: Cash ISA 4,200 at 4.1% AER (the current account is not a savings account).
//   interest over 12 months: 4,200 x 0.041 = 172.20, shown as £172.
//   no pension pot account, so no pots list.
//   you pay in: 38,000 x 5% = 1,900 a year / 12 = 158.33, shown as £158.
//   your employer pays in: 38,000 x 3% = 1,140 a year / 12 = 95.
//
// homeowner (homeowner.ts, employer rate 4%):
//   savings: Cash and emergency savings 21,000 at 3.5% AER.
//   interest over 12 months: 21,000 x 0.035 = 735.
//   pension pot: Workplace and personal pension 96,000.
//   you pay in: 52,000 x 5% = 2,600 a year / 12 = 216.67, shown as £217.
//   your employer pays in: 52,000 x 4% = 2,080 a year / 12 = 173.33, shown as £173.
describe("SavingsPensionPreview", () => {
  it("shows the renter's savings, the interest estimate and what is paid in", () => {
    render(<SavingsPensionPreview household="renter" id="sp" />);

    const isa = within(screen.getByTestId("sp-savings-list-sam-cash-isa"));
    expect(isa.getByText("Cash ISA")).toBeDefined();
    expect(isa.getByText("4.1% AER")).toBeDefined();
    expect(isa.getByText("£4,200")).toBeDefined();
    expect(screen.queryByText("Monzo current")).toBeNull();

    const interest = within(screen.getByTestId("sp-interest"));
    expect(
      interest.getByText("Estimated interest over the next 12 months, before tax"),
    ).toBeDefined();
    expect(interest.getByText("£172")).toBeDefined();

    expect(screen.queryByTestId("sp-pots")).toBeNull();
    expect(within(screen.getByTestId("sp-paid-in-you")).getByText("£158")).toBeDefined();
    expect(within(screen.getByTestId("sp-paid-in-employer")).getByText("£95")).toBeDefined();
  });

  it("shows the homeowner's savings, pension pot and contributions", () => {
    render(<SavingsPensionPreview household="homeowner" id="sp-owner" />);

    const cash = within(screen.getByTestId("sp-owner-savings-list-homeowner-cash"));
    expect(cash.getByText("Cash and emergency savings")).toBeDefined();
    expect(cash.getByText("3.5% AER")).toBeDefined();
    expect(cash.getByText("£21,000")).toBeDefined();
    expect(within(screen.getByTestId("sp-owner-interest")).getByText("£735")).toBeDefined();

    const pot = within(screen.getByTestId("sp-owner-pots-homeowner-pension"));
    expect(pot.getByText("Workplace and personal pension")).toBeDefined();
    expect(pot.getByText("£96,000")).toBeDefined();

    expect(within(screen.getByTestId("sp-owner-paid-in-you")).getByText("£217")).toBeDefined();
    expect(within(screen.getByTestId("sp-owner-paid-in-employer")).getByText("£173")).toBeDefined();
  });

  it("sets no target, suggests nothing and keeps to one headline at most", () => {
    const { container } = render(<SavingsPensionPreview household="homeowner" id="sp-copy" />);
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/target|should|consider|increase|boost|more/i);
    expect(container.querySelector('[data-hero-figure], [data-testid$="-hero"]')).toBeNull();
    // Every figure uses tabular numbers through its recipe.
    for (const figure of screen.getAllByText(/£/)) {
      expect(figure.className).toMatch(/tabular-nums|fv-num_tabular-nums/);
    }
  });
});
