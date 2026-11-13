import { whatIfGrossChange } from "@flump/finance-engine";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  explorerScenario,
  MARGINAL_RATE_EXPLORER_DEFAULTS,
  MarginalRateExplorer,
  MarginalRateExplorerStandalone,
  parseStudentLoanPlans,
} from "./MarginalRateExplorer";

describe("MarginalRateExplorer", () => {
  it("defaults to £39,000, no pension, no student loan and no Child Benefit", () => {
    expect(MARGINAL_RATE_EXPLORER_DEFAULTS).toMatchObject({
      grossPay: 39_000,
      bonus: 0,
      region: "ENGLAND_NI_WALES",
      pensionMethod: "none",
      studentLoans: "",
      childBenefit: false,
      children: 1,
      extraPension: 0,
    });
  });

  it("shows the same next £1,000 as whatIfGrossChange for the default (£720)", () => {
    render(<MarginalRateExplorerStandalone />);
    const expected = whatIfGrossChange(explorerScenario(MARGINAL_RATE_EXPLORER_DEFAULTS), 1000);
    expect(expected.deltaTakeHome).toBe(720);
    expect(screen.getByTestId("take-home-delta-sentence").textContent).toBe(
      "Of the next £1,000 of pay, an estimated £720 is take-home: £200 Income Tax and £80 National Insurance.",
    );
    const strip = screen.getByText("Take-home from the next £1,000").closest("div")?.parentElement;
    expect(strip?.textContent).toContain("£720");
    expect(screen.getByText("28%")).toBeDefined();
  });

  it("draws the chart with thresholds and your pay", () => {
    render(<MarginalRateExplorerStandalone />);
    expect(
      screen.getByRole("figure", { name: "Deducted from the next £1, by gross pay" }),
    ).toBeDefined();
    expect(screen.getAllByTestId("marginal-rate-threshold").length).toBeGreaterThan(3);
    expect(screen.getByTestId("marginal-rate-your-pay")).toBeDefined();
  });

  it("is controlled: inputs call onChange and never change values by themselves", () => {
    const onChange = vi.fn();
    render(<MarginalRateExplorer values={MARGINAL_RATE_EXPLORER_DEFAULTS} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Gross pay a year range slider"), {
      target: { value: "60000" },
    });
    expect(onChange).toHaveBeenCalledWith("grossPay", 60000);
  });

  it("pre-fills the extra pension at £1,000 and previews it", () => {
    render(<MarginalRateExplorerStandalone />);
    fireEvent.click(screen.getByRole("button", { name: "Model a pension contribution" }));
    const pill = screen.getByLabelText("Extra pension contribution input") as HTMLInputElement;
    expect(pill.value).toBe("£1,000");
    expect(screen.getByTestId("take-home-delta-pension").textContent).toBe(
      "An extra £1,000 a year into your pension would lower take-home by an estimated £720, and £1,000 would reach your pension.",
    );
    expect(
      screen.getByText("The pension contribution is modelled as salary sacrifice."),
    ).toBeDefined();
  });

  it("offers the year's student loan plans under More details, closed by default", () => {
    render(<MarginalRateExplorerStandalone />);
    expect(screen.queryByRole("group", { name: "Student loan plans" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "More details" }));
    const group = screen.getByRole("group", { name: "Student loan plans" });
    expect(within(group).getByLabelText("Plan 2")).toBeDefined();
    expect(within(group).getByLabelText("Postgraduate loan")).toBeDefined();
    fireEvent.click(within(group).getByLabelText("Plan 2"));
    expect(screen.getByTestId("take-home-delta-sentence").textContent).toContain("student loan");
  });

  it("adds the Child Benefit charge zone when Child Benefit is on", () => {
    render(<MarginalRateExplorerStandalone initialValues={{ childBenefit: true, children: 2 }} />);
    expect(screen.getAllByTestId("marginal-rate-stepped-zone")).toHaveLength(1);
  });

  it("parses plan strings in a fixed order", () => {
    expect(parseStudentLoanPlans("postgrad+plan2+nonsense")).toEqual(["plan2", "postgrad"]);
    expect(parseStudentLoanPlans("")).toEqual([]);
  });
});
