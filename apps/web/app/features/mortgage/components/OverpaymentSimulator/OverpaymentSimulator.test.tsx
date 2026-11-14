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
    // The payment summary under the slider is gone: it repeated the figure beside the outcome.
    expect(container.textContent).not.toMatch(/Total each month|Usual monthly payment/);
    // One outcome: no extra sentence restates it under the value or above the chart.
    expect(container.textContent).not.toMatch(/instead of 25 years/);
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
    expect(getByText("Interest payment with the extra")).toBeDefined();
    expect(container.textContent).not.toMatch(/Left to repay at the end of the term: £/);
  });

  test("two lines are named by the figure's legend, never by labels on the plot", () => {
    const { container, getByRole } = customRender(<OverpaymentSimulator {...props} />);
    const legend = getByRole("list", { name: "Chart key" });
    expect(legend.textContent).toContain("No overpayment");
    expect(legend.textContent).toContain("With overpayment");
    expect(container.querySelector("[data-direct-label]")).toBeNull();
    expect(container.textContent).not.toMatch(/\(solid\)|\(dashed\)/);
  });

  test("one line has no legend and no plot label: the figure title names it", () => {
    const { container, queryByRole } = customRender(
      <OverpaymentSimulator {...props} overpayment={0} />,
    );
    expect(queryByRole("list", { name: "Chart key" })).toBeNull();
    expect(container.querySelector("[data-direct-label]")).toBeNull();
  });

  test("the data table uses calendar years, not Year 1 to 25", () => {
    const { container, getByRole } = customRender(<OverpaymentSimulator {...props} />);
    fireEvent.click(getByRole("button", { name: /Show data/ }));
    const rows = Array.from(container.querySelectorAll("tbody th")).map((th) => th.textContent);
    const thisYear = new Date().getFullYear();
    expect(rows[0]).toBe(String(thisYear));
    expect(rows.at(-1)).toBe(String(thisYear + 25));
    expect(container.textContent).not.toMatch(/Year \d|\bNow\b/);
    expect(container.querySelectorAll("thead th")).toHaveLength(3);
  });

  test("with no overpayment the data table has one balance column, not two identical ones", () => {
    const { container, getByRole } = customRender(
      <OverpaymentSimulator {...props} overpayment={0} />,
    );
    fireEvent.click(getByRole("button", { name: /Show data/ }));
    expect(container.querySelectorAll("thead th")).toHaveLength(2);
    expect(container.textContent).not.toMatch(/with overpayment/);
  });

  test("a term part way through a year ends on the year the term ends", () => {
    const { container, getByRole } = customRender(
      <OverpaymentSimulator {...props} remainingTerm={218 / 12} />,
    );
    fireEvent.click(getByRole("button", { name: /Show data/ }));
    const rows = Array.from(container.querySelectorAll("tbody th")).map((th) => th.textContent);
    const now = new Date();
    const endYear = new Date(now.getFullYear(), now.getMonth() + 218, 1).getFullYear();
    expect(rows.at(-1)).toBe(String(endYear));
    expect(new Set(rows).size).toBe(rows.length);
    expect(container.textContent).not.toMatch(/Year \d/);
  });

  test("at £0 shows one short prompt and no supporting figures or totals", () => {
    const { container, getByTestId } = customRender(
      <OverpaymentSimulator {...props} overpayment={0} />,
    );
    const outcome = getByTestId("overpayment-outcome");
    expect(outcome.textContent).toBe("Move the slider to see what changes");
    expect(container.querySelectorAll("dl")).toHaveLength(0);
    expect(container.textContent).not.toMatch(
      /No change yet|Monthly payment with the extra|Less interest|Total each month|Usual monthly/,
    );
    expect(container.textContent).not.toMatch(/\b0 months?\b/i);
  });

  test("at £0 the chart summary is for screen readers only", () => {
    const { getByRole } = customRender(<OverpaymentSimulator {...props} overpayment={0} />);
    const figure = getByRole("figure", { name: "Mortgage balance by year" });
    expect(figure.textContent).toContain("Illustration: the mortgage is paid off over 25 years.");
    expect(figure.textContent).not.toMatch(/Add a monthly overpayment/);
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

  test("the early repayment charge fact is a quiet helper line under the slider", () => {
    const { getByLabelText, getByText, container } = customRender(
      <OverpaymentSimulator {...props} />,
    );
    expect(OVERPAYMENT_ERC_NOTE).toMatch(/^Many fixed-rate deals allow overpayments/);
    const helper = getByText(OVERPAYMENT_ERC_NOTE);
    const describedBy = getByLabelText("Extra each month").getAttribute("aria-describedby") ?? "";
    expect(describedBy.split(" ")).toContain(helper.id);
    expect(container.querySelectorAll("[data-notice='projection']")).toHaveLength(0);
  });
});
