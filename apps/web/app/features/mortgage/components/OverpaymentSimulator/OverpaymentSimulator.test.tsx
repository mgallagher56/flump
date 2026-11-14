import { fireEvent } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import customRender from "~/testUtils/customRender";
import { OVERPAYMENT_ERC_NOTE, OverpaymentSimulator } from "./OverpaymentSimulator";

const props = {
  loanAmount: 200000,
  interestRate: 4,
  remainingTerm: 25,
  overpayment: 200,
  onOverpaymentChange: vi.fn(),
};

describe("<OverpaymentSimulator />", () => {
  test("shows one outcome, two supporting figures and the chart, with no nested cards", () => {
    const { getByText, container } = customRender(<OverpaymentSimulator {...props} />);
    expect(getByText("Paid off sooner by")).toBeDefined();
    expect(getByText("Monthly payment with the extra")).toBeDefined();
    expect(getByText("Less interest in total (estimate)")).toBeDefined();
    expect(getByText(/Total each month:/)).toBeDefined();
    expect(getByText(/instead of 25 years/)).toBeDefined();
    // A scenario outcome is never the hero surface, and the zone holds no cards of its own.
    expect(container.querySelectorAll("[data-tone='hero']")).toHaveLength(0);
    expect(container.querySelectorAll("[data-kpi-card], [data-testid='kpi-card']")).toHaveLength(0);
    expect(container.textContent).not.toMatch(/Time shaved off|outflow|Projection|\/mo\b/);
  });

  test("drives the overpayment through the slider and its value field", () => {
    const onOverpaymentChange = vi.fn();
    const { getByLabelText } = customRender(
      <OverpaymentSimulator {...props} onOverpaymentChange={onOverpaymentChange} />,
    );
    fireEvent.change(getByLabelText("Extra each month"), {
      target: { value: "500" },
    });
    expect(onOverpaymentChange).toHaveBeenCalledWith(500);
  });

  test("interest-only shows the smaller loan left at the end, and no end date for the plain line", () => {
    const { getByText, container } = customRender(
      <OverpaymentSimulator {...props} mortgageType="interest-only" overpayment={500} />,
    );
    expect(getByText("Less to repay at the end of the term")).toBeDefined();
    expect(getByText(/Usual interest payment:/)).toBeDefined();
    expect(container.textContent).toMatch(/the full £200,000 is due at the end/);
    expect(container.textContent).not.toMatch(/No overpayment, ends after/);
  });

  test("says no change yet when there is no overpayment, never a zero-month result", () => {
    const { container } = customRender(<OverpaymentSimulator {...props} overpayment={0} />);
    expect(container.textContent).toContain("No change yet");
    expect(container.textContent).not.toMatch(/\b0 months?\b/i);
  });

  test("with missing figures it says what to add, with no Not set, NaN or Infinity", () => {
    const { container, getByText } = customRender(
      <OverpaymentSimulator {...props} loanAmount={0} interestRate={0} remainingTerm={0} />,
    );
    expect(getByText(/Add your balance, interest rate and years left/)).toBeDefined();
    expect(container.textContent).not.toMatch(/NaN|Infinity|Not set|\b0 months?\b/);
  });

  test("names the chart and describes the illustration in one sentence", () => {
    const { getByRole } = customRender(<OverpaymentSimulator {...props} />);
    const figure = getByRole("figure", { name: "Mortgage balance by year" });
    expect(figure.textContent).toMatch(
      /Illustration: overpaying £200 a month means £[\d,]+ less interest in total/,
    );
    expect(figure.textContent).toMatch(/Assumes the rate stays at 4% for the whole term\./);
    expect(figure.textContent).not.toMatch(/Projection, not a forecast/);
  });

  test("the early repayment charge fact is exported for the zone notice, not drawn here", () => {
    const { queryByText } = customRender(<OverpaymentSimulator {...props} />);
    expect(OVERPAYMENT_ERC_NOTE).toMatch(/^Many fixed-rate deals allow overpayments/);
    expect(queryByText(OVERPAYMENT_ERC_NOTE)).toBeNull();
  });
});
