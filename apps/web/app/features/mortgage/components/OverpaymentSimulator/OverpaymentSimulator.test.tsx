import { fireEvent } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import customRender from "~/testUtils/customRender";
import { OVERPAYMENT_ERC_NOTE, OverpaymentSimulator } from "./OverpaymentSimulator";

describe("<OverpaymentSimulator />", () => {
  const defaultProps = {
    loanAmount: 200000,
    interestRate: 4,
    remainingTerm: 25,
    overpayment: 200,
    onOverpaymentChange: vi.fn(),
  };

  test("renders parameter controls, stats, and amortisation savings", () => {
    const { getByText, getAllByDisplayValue } = customRender(
      <OverpaymentSimulator {...defaultProps} />,
    );

    expect(getByText("Overpayment")).toBeDefined();
    expect(getByText("How your balance falls")).toBeDefined();
    expect(getByText("Time shaved off")).toBeDefined();
    expect(getByText("Interest saved")).toBeDefined();
    expect(getByText(/Total monthly outflow:/i)).toBeDefined();

    // Verify slider change
    const slider = document.querySelector("input[type='range']") as HTMLInputElement;
    fireEvent.change(slider, { target: { value: "300" } });
    expect(defaultProps.onOverpaymentChange).toHaveBeenCalledWith(300);

    // Verify number input change
    const numberInputs = getAllByDisplayValue("200");
    const numberInput = numberInputs.find((el) => el.getAttribute("type") === "number");
    if (numberInput) {
      fireEvent.change(numberInput, { target: { value: "400" } });
      expect(defaultProps.onOverpaymentChange).toHaveBeenCalledWith(400);
    }
  });

  test("renders with interest-only mortgage type", () => {
    const { getByText } = customRender(
      <OverpaymentSimulator {...defaultProps} mortgageType="interest-only" overpayment={500} />,
    );

    expect(getByText("How your balance falls")).toBeDefined();
    expect(getByText(/Scheduled Interest Payment:/i)).toBeDefined();
    expect(getByText("Bullet balance reduced")).toBeDefined();
  });

  test("handles zero values cleanly without NaN errors", () => {
    const { getByText } = customRender(
      <OverpaymentSimulator
        {...defaultProps}
        loanAmount={0}
        interestRate={0}
        remainingTerm={0}
        overpayment={0}
      />,
    );

    expect(getByText("How your balance falls")).toBeDefined();
  });

  test("empty profile (all zeros) shows no NaN, Infinity or zero-month result", () => {
    const { container } = customRender(
      <OverpaymentSimulator {...defaultProps} interestRate={0} loanAmount={0} remainingTerm={0} />,
    );
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/NaN|Infinity/);
    expect(text).not.toMatch(/\b0 months?\b/i);
  });
});

describe("<OverpaymentSimulator /> unknown inputs and copy", () => {
  test("shows Not set for the results when the mortgage details are missing", () => {
    const { getAllByText, getByText } = customRender(
      <OverpaymentSimulator
        loanAmount={0}
        interestRate={0}
        remainingTerm={0}
        overpayment={0}
        onOverpaymentChange={vi.fn()}
      />,
    );
    expect(getAllByText("Not set").length).toBeGreaterThanOrEqual(5);
    expect(getByText("Mortgage details not set")).toBeDefined();
  });

  test("shows the early repayment charge caveat as a callout beside the results", () => {
    const { getByText } = customRender(
      <OverpaymentSimulator
        loanAmount={200000}
        interestRate={4}
        remainingTerm={25}
        overpayment={200}
        onOverpaymentChange={vi.fn()}
      />,
    );
    expect(getByText(OVERPAYMENT_ERC_NOTE)).toBeDefined();
  });

  test("drives the overpayment through the named range slider", () => {
    const onOverpaymentChange = vi.fn();
    const { getByLabelText } = customRender(
      <OverpaymentSimulator
        loanAmount={200000}
        interestRate={4}
        remainingTerm={25}
        overpayment={200}
        onOverpaymentChange={onOverpaymentChange}
      />,
    );
    fireEvent.change(getByLabelText("Monthly overpayment range slider"), {
      target: { value: "500" },
    });
    expect(onOverpaymentChange).toHaveBeenCalledWith(500);
  });
});

describe("<OverpaymentSimulator /> chart accessibility", () => {
  test("exposes the projection as a named figure with the interest saved headline", () => {
    const { getByRole } = customRender(
      <OverpaymentSimulator
        loanAmount={200000}
        interestRate={4}
        remainingTerm={25}
        overpayment={200}
        onOverpaymentChange={vi.fn()}
      />,
    );

    const figure = getByRole("figure", { name: "Mortgage balance projection" });
    expect(figure.textContent).toMatch(/Overpaying £200 a month saves £[\d,]+ in total interest/);
  });
});

describe("<OverpaymentSimulator /> hero card", () => {
  const props = {
    loanAmount: 200000,
    interestRate: 4,
    remainingTerm: 25,
    overpayment: 200,
    onOverpaymentChange: vi.fn(),
  };

  test("makes 'Time shaved off' the single hero card for repayment mortgages", () => {
    const { getByText } = customRender(<OverpaymentSimulator {...props} />);
    const heroes = document.querySelectorAll("[data-tone='hero']");
    expect(heroes).toHaveLength(1);
    expect(heroes[0]?.contains(getByText("Time shaved off"))).toBe(true);
    expect(heroes[0]?.contains(getByText("Interest saved"))).toBe(false);
    expect(heroes[0]?.textContent).toMatch(/Mortgage-free \d+ years?( \d+ months?)? sooner/);
    expect(heroes[0]?.textContent).toMatch(/instead of 25 years/);
  });

  test("shows at most four KPIs in the strip under the hero, in plain language", () => {
    const { getByText } = customRender(<OverpaymentSimulator {...props} />);
    for (const label of [
      "Monthly payment",
      "Total interest, no overpayment",
      "Total interest with overpayment",
      "Interest saved",
    ]) {
      expect(getByText(label)).toBeDefined();
    }
    expect(getByText(/Assumes the rate stays at 4% for the whole term/)).toBeDefined();
  });

  test("says no change yet when there is no overpayment, never a zero-month result", () => {
    const { container } = customRender(<OverpaymentSimulator {...props} overpayment={0} />);
    const hero = container.querySelector("[data-tone='hero']");
    expect(hero?.textContent).toContain("No change yet");
    expect(container.textContent).not.toMatch(/\b0 months?\b/i);
  });

  test("makes 'Bullet balance reduced' the single hero card for interest-only mortgages", () => {
    const { getByText } = customRender(
      <OverpaymentSimulator {...props} mortgageType="interest-only" overpayment={500} />,
    );
    const heroes = document.querySelectorAll("[data-tone='hero']");
    expect(heroes).toHaveLength(1);
    expect(heroes[0]?.contains(getByText("Bullet balance reduced"))).toBe(true);
  });
});
