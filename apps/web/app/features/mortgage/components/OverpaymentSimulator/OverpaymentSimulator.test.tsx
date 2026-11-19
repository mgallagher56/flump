import { fireEvent } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import customRender from "~/testUtils/customRender";
import {
  OVERPAYMENT_ERC_NOTE,
  OverpaymentSimulator,
  overpayEmptyPrompt,
} from "./OverpaymentSimulator";

const props = {
  loanAmount: 200000,
  interestRate: 4,
  remainingTerm: 25,
  overpayment: 200,
  onOverpaymentChange: vi.fn(),
};

describe("<OverpaymentSimulator />", () => {
  test("shows one result card with one note and one supporting row, and the chart", () => {
    const { getByText, getAllByRole, container } = customRender(
      <OverpaymentSimulator {...props} />,
    );
    // E17 5A: one result card, labelled by the outcome, with one row; the interest saved is its note.
    expect(getAllByRole("group", { name: "Paid off sooner by" })).toHaveLength(1);
    expect(getByText("Monthly payment with the extra")).toBeDefined();
    // A lifetime projection: "~" and three significant figures (B9), never to the pound.
    const note =
      getByText(
        /^Less interest in total \(estimate\): ~£[\d,]+\. Assumes the rate stays at 4% for the whole term\.$/,
      ).textContent ?? "";
    const digits = (note.match(/~£([\d,]+)/)?.[1] ?? "").replace(/\D/g, "");
    expect(digits.length <= 3 || /^\d{3}0+$/.test(digits)).toBe(true);
    expect(container.querySelectorAll("#overpayment-outcome dt")).toHaveLength(1);
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
    expect(outcome.querySelector('[data-slot="empty"]')?.textContent).toBe(
      "Move the slider to see what changes",
    );
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

  test("a buy to let with balance and rate saved is asked for the years left only (P40)", () => {
    const { getByText, queryByText } = customRender(
      <OverpaymentSimulator {...props} mortgageType="interest-only" remainingTerm={0} />,
    );
    expect(
      getByText("Add the years left under Starting figures to see what overpaying would change."),
    ).toBeDefined();
    expect(queryByText(/balance, interest rate/)).toBeNull();
  });

  test("names only the figures that are missing", () => {
    // Every figure present: no list of missing figures to name.
    expect(overpayEmptyPrompt(150000, 4.5, 20)).toBe(
      "Check your starting figures to see what overpaying would change.",
    );
    expect(overpayEmptyPrompt(0, 5, 20)).toBe(
      "Add your balance to see what overpaying would change.",
    );
    expect(overpayEmptyPrompt(0, 0, 20)).toBe(
      "Add your balance and interest rate to see what overpaying would change.",
    );
  });

  test("names the chart and describes the illustration in one sentence", () => {
    const { getByRole } = customRender(<OverpaymentSimulator {...props} />);
    const figure = getByRole("figure", { name: "Mortgage balance by year" });
    expect(figure.textContent).toMatch(
      /Illustration: overpaying £200 a month means ~£[\d,]+ less interest in total/,
    );
    expect(figure.textContent).not.toMatch(/Projection, not a forecast/);
  });

  test("the rate assumption sits in the result card, at £0 too, not under the chart", () => {
    const { getByTestId, getByRole, rerender } = customRender(<OverpaymentSimulator {...props} />);
    expect(getByTestId("overpayment-outcome").textContent).toMatch(
      /Assumes the rate stays at 4% for the whole term\./,
    );
    expect(getByRole("figure", { name: "Mortgage balance by year" }).textContent).not.toMatch(
      /Assumes the rate/,
    );
    rerender(<OverpaymentSimulator {...props} overpayment={0} />);
    expect(getByTestId("overpayment-outcome").textContent).toMatch(
      /Assumes the rate stays at 4% for the whole term\./,
    );
  });

  test("the early repayment charge fact is behind an info button and read with the slider", async () => {
    const { getByLabelText, getByRole, findByRole, container } = customRender(
      <OverpaymentSimulator {...props} />,
    );
    expect(OVERPAYMENT_ERC_NOTE).toMatch(/^Many fixed-rate deals allow overpayments/);
    // No visible paragraph: only the hidden copy the slider names, and the popover once opened.
    const hidden = Array.from(container.querySelectorAll("[id^='overpayment-erc-note-']"));
    expect(hidden).toHaveLength(1);
    expect(hidden[0]?.textContent).toBe(OVERPAYMENT_ERC_NOTE);
    const describedBy = getByLabelText("Extra each month").getAttribute("aria-describedby") ?? "";
    expect(describedBy.split(" ")).toContain(hidden[0]?.id);
    expect(container.textContent).not.toMatch(/Model an extra payment each month/);
    fireEvent.click(getByRole("button", { name: "About overpayment limits" }));
    const popover = await findByRole("dialog", { name: "Overpayment limits" });
    expect(popover.textContent).toContain(OVERPAYMENT_ERC_NOTE);
    expect(container.querySelectorAll("[data-notice='projection']")).toHaveLength(0);
  });
});
