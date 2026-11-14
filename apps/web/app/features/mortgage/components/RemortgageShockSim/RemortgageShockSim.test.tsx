import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { monthlyMortgagePayment } from "~/utils/mortgagePayment";
import { RemortgageShockSim } from "./RemortgageShockSim";

// Catches £0, £0.00 and £0,000 alike.
const ZERO_MONEY = /£\s*0(?:[,.]0+)*(?!\d)/;

describe("RemortgageShockSim", () => {
  it("shows the payment change and the next LTV band as estimates", () => {
    render(
      <RemortgageShockSim
        currentBalance={280000}
        currentRate={2.5}
        fixEndDate="2099-10-01"
        propertyValue={350000}
      />,
    );

    expect(screen.getByText(/left on your 2.5% fixed rate/i)).toBeDefined();
    expect(screen.getByText("Change in monthly payment (estimate)")).toBeDefined();
    expect(screen.getByText(/Next LTV band: 75%/)).toBeDefined();
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
    expect(container.textContent ?? "").toContain("Add your mortgage balance and property value");
    expect(container.textContent ?? "").not.toMatch(ZERO_MONEY);
  });

  it("does not invent a property value when none is supplied", () => {
    render(<RemortgageShockSim currentBalance={280000} currentRate={2.5} />);
    expect(screen.getByText(/Add your property value to see your loan to value/)).toBeDefined();
    expect(screen.queryByText(/^Next LTV band:/)).toBeNull();
  });

  it("uses a real property value when supplied", () => {
    render(<RemortgageShockSim currentBalance={280000} currentRate={2.5} propertyValue={350000} />);
    expect(screen.queryByText(/Add your property value/)).toBeNull();
    expect(screen.getByText(/current LTV: 80.0%/i)).toBeDefined();
  });

  it("does not invent a fix end date", () => {
    render(<RemortgageShockSim currentBalance={280000} currentRate={2.5} propertyValue={350000} />);
    expect(screen.getByText(/Fixed rate end date not set/)).toBeDefined();
    expect(screen.queryByText(/left on your/i)).toBeNull();
  });

  it("seeds the end date and term from the user's own figures", () => {
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
    expect((screen.getByLabelText("Years left") as HTMLInputElement).value).toBe("18");
  });

  it("moving the new rate slider changes the estimated payment", () => {
    render(<RemortgageShockSim currentBalance={280000} currentRate={2.5} propertyValue={350000} />);
    const before = document.body.textContent;
    fireEvent.change(screen.getByLabelText("Rate after your fixed rate ends"), {
      target: { value: "8" },
    });
    expect(
      (screen.getByLabelText("Rate after your fixed rate ends") as HTMLInputElement).value,
    ).toBe("8");
    expect(document.body.textContent).not.toBe(before);
  });

  describe("reseeding from props", () => {
    const term = () => screen.getByLabelText("Years left") as HTMLInputElement;
    const year = () => screen.getByLabelText("Fixed rate end year") as HTMLSelectElement;
    const month = () => screen.getByLabelText("Fixed rate end month") as HTMLSelectElement;
    const base = { currentBalance: 280000, currentRate: 2.5 };

    it("reseeds the term and fix date when the props change", () => {
      const { rerender } = render(
        <RemortgageShockSim {...base} fixEndDate="2099-10-01" remainingTermYears={18} />,
      );
      expect(term().value).toBe("18");
      rerender(<RemortgageShockSim {...base} fixEndDate="2098-03-01" remainingTermYears={12} />);
      expect(term().value).toBe("12");
      expect(year().value).toBe("2098");
      expect(month().value).toBe("3");
    });

    it("does not clobber a term or fix date the user has edited", () => {
      const { rerender } = render(
        <RemortgageShockSim {...base} fixEndDate="2099-10-01" remainingTermYears={18} />,
      );
      fireEvent.change(term(), { target: { value: "30" } });
      fireEvent.change(year(), { target: { value: "2031" } });
      fireEvent.change(month(), { target: { value: "6" } });
      rerender(<RemortgageShockSim {...base} fixEndDate="2098-03-01" remainingTermYears={12} />);
      expect(term().value).toBe("30");
      expect(year().value).toBe("2031");
      expect(month().value).toBe("6");
    });

    it("reseeds one value even when the other was edited", () => {
      const { rerender } = render(
        <RemortgageShockSim {...base} fixEndDate="2099-10-01" remainingTermYears={18} />,
      );
      fireEvent.change(term(), { target: { value: "30" } });
      rerender(<RemortgageShockSim {...base} fixEndDate="2098-03-01" remainingTermYears={12} />);
      expect(term().value).toBe("30");
      expect(year().value).toBe("2098");
    });

    it("widens the term slider when the seeded term is outside 5 to 40", () => {
      const { rerender } = render(<RemortgageShockSim {...base} remainingTermYears={3} />);
      expect(term().value).toBe("3");
      expect(term().min).toBe("3");
      expect(term().max).toBe("40");
      rerender(<RemortgageShockSim {...base} remainingTermYears={45} />);
      expect(term().value).toBe("45");
      expect(term().min).toBe("5");
      expect(term().max).toBe("45");
    });

    it("rounds a sub-year term to one year so the slider and payments stay valid", () => {
      const { container } = render(<RemortgageShockSim {...base} remainingTermYears={0.4} />);
      expect(term().value).toBe("1");
      expect(container.textContent ?? "").not.toMatch(/NaN|Infinity/);
    });
  });
});
