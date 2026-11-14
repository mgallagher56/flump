import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { monthlyMortgagePayment } from "~/utils/mortgagePayment";
import { RemortgageShockSim } from "./RemortgageShockSim";

// Catches £0, £0.00 and £0,000 alike.
const ZERO_MONEY = /£\s*0(?:[,.]0+)*(?!\d)/;

describe("RemortgageShockSim", () => {
  it("shows the payment change as an estimate, with no loan to value block of its own", () => {
    render(
      <RemortgageShockSim currentBalance={280000} currentRate={2.5} fixEndDate="2099-10-01" />,
    );

    expect(screen.getByText(/left on your 2.5% fixed rate/i)).toBeDefined();
    expect(screen.getByText("Change in monthly payment (estimate)")).toBeDefined();
    // Loan to value bands live in the page's own drawer, so the zone has one "More options".
    expect(screen.queryByRole("button", { name: "More options" })).toBeNull();
    expect(document.body.textContent).not.toMatch(/LTV/);
    // No alarm wording or danger colour on an ordinary rate change.
    expect(document.body.textContent).not.toMatch(/shock|tier|bracket|\/mo\b/i);
    const change = screen.getByText("Change in monthly payment (estimate)").nextElementSibling;
    expect(change?.outerHTML ?? "").not.toMatch(/danger/);
  });

  it("shows the same current payment as the mortgage KPI, over the exact remaining term", () => {
    // 218 months is 18.17 years: the whole-year slider shows 18, but the payment uses 218 months.
    const remainingTermYears = 218 / 12;
    const kpi = Math.round(monthlyMortgagePayment(186000, 4.5, remainingTermYears, "repayment"));
    expect(kpi).toBe(1250);
    render(
      <RemortgageShockSim
        currentBalance={186000}
        currentRate={4.5}
        mortgageType="repayment"
        remainingTermYears={remainingTermYears}
      />,
    );
    expect(document.body.textContent).toContain("£1,250");
  });

  it("uses the interest-only payment when the mortgage is interest-only", () => {
    render(
      <RemortgageShockSim
        currentBalance={120000}
        currentRate={5}
        mortgageType="interest-only"
        remainingTermYears={10}
      />,
    );
    // 120,000 at 5% interest only is £500 a month.
    expect(document.body.textContent).toContain("£500");
  });

  it("empty profile (zero balance and rate) shows no NaN or Infinity", () => {
    const { container } = render(<RemortgageShockSim currentBalance={0} currentRate={0} />);
    expect(container.textContent ?? "").not.toMatch(/NaN|Infinity/);
  });

  it("says what to add rather than £0 when balance and rate are unknown", () => {
    const { container } = render(<RemortgageShockSim currentBalance={0} currentRate={0} />);
    expect(container.textContent ?? "").toContain("Add your balance and interest rate");
    expect(container.textContent ?? "").not.toMatch(ZERO_MONEY);
  });

  it("does not invent a fix end date", () => {
    render(<RemortgageShockSim currentBalance={280000} currentRate={2.5} />);
    expect(screen.getByText(/Fixed rate end date not set/)).toBeDefined();
    expect(screen.queryByText(/left on your/i)).toBeNull();
  });

  it("seeds the end date from the user's own figures and has no term control of its own", () => {
    render(
      <RemortgageShockSim
        currentBalance={280000}
        currentRate={2.5}
        fixEndDate="2099-10-01"
        remainingTermYears={18}
      />,
    );
    // Over 24 months reads as years and months.
    expect(screen.getByText(/\d+ years( \d+ months?)? left on your 2.5% fixed rate/)).toBeDefined();
    expect(screen.queryByLabelText("Years left")).toBeNull();
  });

  it("moving the new rate slider changes the estimated payment", () => {
    render(<RemortgageShockSim currentBalance={280000} currentRate={2.5} />);
    const before = document.body.textContent;
    fireEvent.change(screen.getByLabelText("Rate after your fixed rate ends"), {
      target: { value: "8" },
    });
    expect(
      (screen.getByLabelText("Rate after your fixed rate ends") as HTMLInputElement).value,
    ).toBe("8");
    expect(document.body.textContent).not.toBe(before);
  });

  it("says the change as one sentence from the fixed rate end month, with two figures", () => {
    render(
      <RemortgageShockSim
        currentBalance={186000}
        currentPayment={1250}
        currentPaymentIsSaved
        currentRate={4.5}
        fixEndDate="2099-09-01"
        remainingTermYears={218 / 12}
      />,
    );
    const outcome = screen.getByTestId("remortgage-outcome");
    expect(outcome.textContent).toMatch(/\+£\d+ a month from Sep 2099/);
    expect(document.body.textContent).not.toMatch(/Sept/);
    const results = screen.getByTestId("remortgage-results");
    expect(results.querySelectorAll("dt")).toHaveLength(2);
    // The saved payment is a fact, so it is not marked as an estimate.
    expect(screen.getByText("Current payment")).toBeDefined();
    expect(results.textContent).toContain("£1,250");
  });

  it("says no change at the current rate, even when the saved payment differs from the formula", () => {
    render(
      <RemortgageShockSim
        currentBalance={186000}
        currentPayment={1300}
        currentPaymentIsSaved
        currentRate={4.5}
        fixEndDate="2099-07-01"
        remainingTermYears={218 / 12}
      />,
    );
    fireEvent.change(screen.getByLabelText("Rate after your fixed rate ends"), {
      target: { value: "4.5" },
    });
    expect(screen.getByTestId("remortgage-outcome").textContent).toContain("No change");
    const results = screen.getByTestId("remortgage-results");
    expect(results.textContent?.match(/£1,300/g)).toHaveLength(2);
  });

  it("moves the saved payment by the formula change between the two rates", () => {
    render(
      <RemortgageShockSim
        currentBalance={186000}
        currentPayment={1300}
        currentPaymentIsSaved
        currentRate={4.5}
        fixEndDate="2099-07-01"
        remainingTermYears={218 / 12}
      />,
    );
    fireEvent.change(screen.getByLabelText("Rate after your fixed rate ends"), {
      target: { value: "5.5" },
    });
    const change =
      monthlyMortgagePayment(186000, 5.5, 218 / 12, "repayment") -
      monthlyMortgagePayment(186000, 4.5, 218 / 12, "repayment");
    const expected = Math.round(1300 + change) - 1300;
    expect(screen.getByTestId("remortgage-outcome").textContent).toContain(
      `+£${expected} a month from Jul 2099`,
    );
  });

  it("without a given payment, both figures come from the formula and a higher rate never falls", () => {
    // The page passes no payment once the scenario rate differs from the saved one.
    render(
      <RemortgageShockSim
        currentBalance={186000}
        currentRate={3}
        fixEndDate="2099-07-01"
        remainingTermYears={218 / 12}
      />,
    );
    const formula = Math.round(monthlyMortgagePayment(186000, 3, 218 / 12, "repayment"));
    const results = screen.getByTestId("remortgage-results");
    expect(screen.getByText("Current payment (estimate)")).toBeDefined();
    expect(results.textContent).toContain(`£${formula.toLocaleString("en-GB")}`);
    // The default new rate (5.2%) is above 3%, so the change is a rise.
    expect(screen.getByTestId("remortgage-outcome").textContent).toMatch(/^.*\+£[\d,]+ a month/);
    fireEvent.change(screen.getByLabelText("Rate after your fixed rate ends"), {
      target: { value: "2" },
    });
    expect(screen.getByTestId("remortgage-outcome").textContent).toMatch(/\u2212£[\d,]+ a month/);
  });

  it("says no change when the new payment matches the current one", () => {
    render(
      <RemortgageShockSim
        currentBalance={186000}
        currentRate={4.5}
        remainingTermYears={218 / 12}
      />,
    );
    fireEvent.change(screen.getByLabelText("Rate after your fixed rate ends"), {
      target: { value: "4.5" },
    });
    expect(screen.getByTestId("remortgage-outcome").textContent).toContain("No change");
    expect(screen.getByText("Current payment (estimate)")).toBeDefined();
  });

  describe("reseeding from props", () => {
    const year = () => screen.getByLabelText("Fixed rate end year") as HTMLSelectElement;
    const month = () => screen.getByLabelText("Fixed rate end month") as HTMLSelectElement;
    const base = { currentBalance: 280000, currentRate: 2.5 };
    const formula = (term: number) =>
      `£${Math.round(monthlyMortgagePayment(280000, 2.5, term, "repayment")).toLocaleString("en-GB")}`;

    it("follows the scenario's remaining term, unrounded, when it changes", () => {
      const { rerender } = render(
        <RemortgageShockSim {...base} fixEndDate="2099-10-01" remainingTermYears={218 / 12} />,
      );
      expect(screen.getByTestId("remortgage-results").textContent).toContain(formula(218 / 12));
      rerender(<RemortgageShockSim {...base} fixEndDate="2098-03-01" remainingTermYears={12.5} />);
      expect(screen.getByTestId("remortgage-results").textContent).toContain(formula(12.5));
      expect(year().value).toBe("2098");
      expect(month().value).toBe("3");
    });

    it("does not clobber a fix date the user has edited", () => {
      const { rerender } = render(
        <RemortgageShockSim {...base} fixEndDate="2099-10-01" remainingTermYears={18} />,
      );
      fireEvent.change(year(), { target: { value: "2031" } });
      fireEvent.change(month(), { target: { value: "6" } });
      rerender(<RemortgageShockSim {...base} fixEndDate="2098-03-01" remainingTermYears={12} />);
      expect(year().value).toBe("2031");
      expect(month().value).toBe("6");
    });

    it("keeps a sub-year term valid", () => {
      const { container } = render(<RemortgageShockSim {...base} remainingTermYears={0.4} />);
      expect(container.textContent ?? "").not.toMatch(/NaN|Infinity/);
    });
  });
});
