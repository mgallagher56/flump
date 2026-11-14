import { fireEvent } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import customRender from "~/testUtils/customRender";
import {
  OverpayVsSaveCompare as Compare,
  type OverpayVsSaveCompareProps,
} from "./OverpayVsSaveCompare";

const OverpayVsSaveCompare = (
  props: Omit<OverpayVsSaveCompareProps, "onOverpaymentChange"> &
    Partial<Pick<OverpayVsSaveCompareProps, "onOverpaymentChange">>,
) => <Compare onOverpaymentChange={vi.fn()} {...props} />;

describe("<OverpayVsSaveCompare />", () => {
  const defaultProps = {
    loanAmount: 250000,
    interestRate: 5,
    remainingTerm: 25,
    overpayment: 300,
  };

  test("renders comparison header, parameters, and chart", () => {
    const { getByText, getByTestId } = customRender(<OverpayVsSaveCompare {...defaultProps} />);

    expect(getByText(/^Assumptions you can change/)).toBeDefined();
    expect(document.body.textContent).toMatch(
      /overpaying the mortgage gives a total £[\d,.]+ higher/i,
    );
    expect(document.body.textContent).not.toMatch(/verdict|emergency fund|liquid|vs\.|parameters/i);
    expect(getByText("Savings interest rate")).toBeDefined();
    expect(getByText("Tax on your savings interest")).toBeDefined();
    expect(getByText("Years to compare")).toBeDefined();
    // No neutral fact takes a danger or positive tone.
    expect(getByTestId("overpay-compare-net-rate").outerHTML).not.toMatch(/danger|positive/);
    // One outcome: the label names the higher total, and no extra sentence restates it.
    expect(getByText("Overpaying the mortgage gives more over 10 years (estimate)")).toBeDefined();
    // The horizon is said once, in the headline: no lead line repeats it.
    expect(document.body.textContent?.match(/over 10 years/g)).toHaveLength(1);
    expect(document.body.textContent).not.toMatch(/gives the higher total/);
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
    const horizon = getByLabelText("Years to compare") as HTMLInputElement;
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
    expect(getByText("Saving the money gives more over 10 years (estimate)")).toBeDefined();
  });

  test("handles zero parameters cleanly, with no pointer to another tab", () => {
    const { container } = customRender(
      <OverpayVsSaveCompare loanAmount={0} interestRate={0} remainingTerm={0} overpayment={0} />,
    );
    expect(container.textContent).not.toMatch(/No overpayment set|Overpay.{0,4} tab|NaN/);
  });

  test("has its own amount slider, bound to the shared overpayment", () => {
    const onOverpaymentChange = vi.fn();
    const { getByLabelText } = customRender(
      <OverpayVsSaveCompare {...defaultProps} onOverpaymentChange={onOverpaymentChange} />,
    );
    const amount = getByLabelText("Amount each month") as HTMLInputElement;
    expect(amount.value).toBe("300");
    expect(amount.max).toBe("2500");
    fireEvent.change(amount, { target: { value: "400" } });
    expect(onOverpaymentChange).toHaveBeenCalledWith(400);
  });

  test("with no amount chosen it asks for one in place, not on the Overpay tab", () => {
    const { getByText, container } = customRender(
      <OverpayVsSaveCompare {...defaultProps} overpayment={0} />,
    );
    expect(
      getByText("Choose an amount each month to compare overpaying with saving."),
    ).toBeDefined();
    expect(container.textContent).not.toMatch(/tab/i);
  });

  test("empty profile (all zeros) shows no NaN or Infinity", () => {
    const { container } = customRender(
      <OverpayVsSaveCompare {...defaultProps} interestRate={0} loanAmount={0} remainingTerm={0} />,
    );
    expect(container.textContent ?? "").not.toMatch(/NaN|Infinity/);
  });
});

describe("<OverpayVsSaveCompare /> unknown inputs and caveats", () => {
  test("says what to add rather than 0% when the mortgage details are missing", () => {
    const { getByText, container } = customRender(
      <OverpayVsSaveCompare loanAmount={0} interestRate={0} overpayment={300} remainingTerm={0} />,
    );
    expect(getByText(/Add your mortgage balance, interest rate and years left/)).toBeDefined();
    expect(container.textContent ?? "").not.toMatch(/0\.00%|£\s*0(?:[,.]0+)*(?!\d)/);
  });

  test("the note states the assumptions without advice; the ERC fact is the zone notice", () => {
    const { container } = customRender(
      <OverpayVsSaveCompare
        loanAmount={250000}
        interestRate={5}
        overpayment={300}
        remainingTerm={25}
      />,
    );
    expect(container.textContent).toMatch(/usually cannot be taken back out/);
    expect(container.textContent).not.toMatch(/early repayment charge|Always keep/);
  });

  test("shows rates as entered, not padded to two places", () => {
    const { getByLabelText, getByTestId } = customRender(
      <OverpayVsSaveCompare
        {...{ loanAmount: 250000, interestRate: 4.5, overpayment: 300, remainingTerm: 25 }}
      />,
    );
    expect((getByLabelText("Savings interest rate input") as HTMLInputElement).value).toBe("4.8%");
    expect(getByTestId("overpay-compare-net-rate").textContent).toContain("4.8%");
    expect(document.body.textContent).not.toMatch(/4\.50%|4\.80%/);
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
    fireEvent.change(getByLabelText("Savings interest rate"), {
      target: { value: "6" },
    });
    expect(getByTestId("overpay-compare-net-rate").textContent).toContain("6%");
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
    const horizon = getByLabelText("Years to compare") as HTMLInputElement;
    expect(horizon.min).toBe("1");
    expect(horizon.max).toBe("1");
    expect(horizon.value).toBe("1");
    expect(container.textContent ?? "").toMatch(/over 1 year \(estimate\)/);
    expect(container.textContent ?? "").not.toMatch(/NaN|Infinity/);
  });

  test("the simulated horizon follows the slider and its max is the term rounded down", () => {
    const { getByLabelText, container } = customRender(
      <OverpayVsSaveCompare {...props} remainingTerm={7.9} />,
    );
    const horizon = getByLabelText("Years to compare") as HTMLInputElement;
    expect(horizon.max).toBe("7");
    fireEvent.change(horizon, { target: { value: "5" } });
    expect(container.textContent ?? "").toMatch(/over 5 years \(estimate\)/);
  });
});
