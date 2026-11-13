import { fireEvent } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import customRender from "~/testUtils/customRender";
import { OverpayVsSaveCompare } from "./OverpayVsSaveCompare";

describe("<OverpayVsSaveCompare />", () => {
  const defaultProps = {
    loanAmount: 250000,
    interestRate: 5,
    remainingTerm: 25,
    overpayment: 300,
  };

  test("renders comparison header, parameters, and chart", () => {
    const { getByText } = customRender(<OverpayVsSaveCompare {...defaultProps} />);

    expect(getByText("Savings parameters")).toBeDefined();
    expect(document.body.textContent).toMatch(
      /overpaying the mortgage gives a total £[\d,.]+ higher/i,
    );
    expect(document.body.textContent).not.toMatch(/verdict/i);
    expect(getByText("Mortgage overpay vs. savings comparison")).toBeDefined();
    expect(getByText(/Savings Interest Rate/i)).toBeDefined();
    expect(getByText(/Savings Tax Bracket/i)).toBeDefined();
    expect(getByText(/Horizon \(Years\)/i)).toBeDefined();
  });

  test("allows changing savings rate slider and tax wrapper select", () => {
    const { getByDisplayValue, getByLabelText } = customRender(
      <OverpayVsSaveCompare {...defaultProps} />,
    );

    // Change tax bracket
    const select = document.querySelector("select") as HTMLSelectElement;
    expect(select).toBeDefined();
    fireEvent.change(select, { target: { value: "higher" } });
    expect(getByDisplayValue("Higher rate (40% tax)")).toBeDefined();

    // Change horizon slider
    const horizon = getByLabelText("Horizon (years) range slider") as HTMLInputElement;
    fireEvent.change(horizon, { target: { value: "15" } });
    expect(horizon.value).toBe("15");
  });

  test("renders interest-only mortgage variation and when saving beats overpaying", () => {
    const { getByText } = customRender(
      <OverpayVsSaveCompare
        {...defaultProps}
        interestRate={3.0}
        mortgageType="interest-only"
        overpayment={400}
      />,
    );

    expect(document.body.textContent).toMatch(/saving the money gives a total £[\d,.]+ higher/i);
    expect(getByText("Mortgage overpay vs. savings comparison")).toBeDefined();
  });

  test("handles zero parameters cleanly", () => {
    const { getByText } = customRender(
      <OverpayVsSaveCompare loanAmount={0} interestRate={0} remainingTerm={0} overpayment={0} />,
    );

    expect(getByText("Savings parameters")).toBeDefined();
    expect(getByText("No overpayment budget set")).toBeDefined();
  });

  test("empty profile (all zeros) shows no NaN or Infinity", () => {
    const { container } = customRender(
      <OverpayVsSaveCompare {...defaultProps} interestRate={0} loanAmount={0} remainingTerm={0} />,
    );
    expect(container.textContent ?? "").not.toMatch(/NaN|Infinity/);
  });
});

describe("<OverpayVsSaveCompare /> unknown inputs and caveats", () => {
  test("renders Not set rather than 0% when the mortgage details are missing", () => {
    const { getByText, getByTestId, container } = customRender(
      <OverpayVsSaveCompare loanAmount={0} interestRate={0} overpayment={300} remainingTerm={0} />,
    );
    expect(getByTestId("overpay-compare-mortgage-rate").textContent).toContain("Not set");
    expect(getByText("Mortgage details not set")).toBeDefined();
    expect(container.textContent ?? "").not.toMatch(/0\.00%|£\s*0(?:[,.]0+)*(?!\d)/);
  });

  test("shows the early repayment charge caveat beside the comparison", () => {
    const { getByTestId } = customRender(
      <OverpayVsSaveCompare
        loanAmount={250000}
        interestRate={5}
        overpayment={300}
        remainingTerm={25}
      />,
    );
    expect(getByTestId("overpay-compare-erc-caveat").textContent).toMatch(
      /early repayment charge \(ERC\) may apply/,
    );
  });

  test("moving the savings rate slider updates the net savings rate", () => {
    const { getByLabelText, getByTestId } = customRender(
      <OverpayVsSaveCompare
        loanAmount={250000}
        interestRate={5}
        overpayment={300}
        remainingTerm={25}
      />,
    );
    fireEvent.change(getByLabelText("Savings interest rate range slider"), {
      target: { value: "6" },
    });
    expect(getByTestId("overpay-compare-net-rate").textContent).toContain("6.00%");
  });
});

describe("<OverpayVsSaveCompare /> chart accessibility", () => {
  test("exposes the comparison as a named figure with the formatted net gain", () => {
    const { getByRole } = customRender(
      <OverpayVsSaveCompare
        loanAmount={250000}
        interestRate={5}
        remainingTerm={25}
        overpayment={300}
      />,
    );

    const figure = getByRole("figure", { name: "Overpay or save comparison" });
    expect(figure.textContent).toMatch(/gives a total £[\d,]+ higher in this estimate/);
  });
});

describe("<OverpayVsSaveCompare /> horizon rule", () => {
  const props = { loanAmount: 250000, interestRate: 5, overpayment: 300 };

  test("a remaining term under a year gives a 1-year slider and a 1-year simulation", () => {
    const { getByLabelText, container } = customRender(
      <OverpayVsSaveCompare {...props} remainingTerm={0.5} />,
    );
    const horizon = getByLabelText("Horizon (years) range slider") as HTMLInputElement;
    expect(horizon.min).toBe("1");
    expect(horizon.max).toBe("1");
    expect(horizon.value).toBe("1");
    expect(container.textContent ?? "").toContain("over a 1-year horizon");
    expect(container.textContent ?? "").not.toMatch(/NaN|Infinity/);
  });

  test("the simulated horizon follows the slider and its max is the term rounded down", () => {
    const { getByLabelText, container } = customRender(
      <OverpayVsSaveCompare {...props} remainingTerm={7.9} />,
    );
    const horizon = getByLabelText("Horizon (years) range slider") as HTMLInputElement;
    expect(horizon.max).toBe("7");
    fireEvent.change(horizon, { target: { value: "5" } });
    expect(container.textContent ?? "").toContain("over a 5-year horizon");
  });
});
