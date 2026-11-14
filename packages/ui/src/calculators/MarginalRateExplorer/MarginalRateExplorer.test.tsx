import { whatIfGrossChange } from "@flump/finance-engine";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  explorerScenario,
  getMarginalRateExplorerDefaults,
  MarginalRateExplorer,
  MarginalRateExplorerStandalone,
  parseStudentLoanPlans,
} from "./MarginalRateExplorer";

const DEFAULTS_2026 = { ...getMarginalRateExplorerDefaults(), taxYear: "2026/27" };

describe("MarginalRateExplorer", () => {
  it("defaults to £39,000, no pension, no student loan and no Child Benefit", () => {
    expect(getMarginalRateExplorerDefaults()).toMatchObject({
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
    render(<MarginalRateExplorerStandalone initialValues={{ taxYear: "2026/27" }} />);
    const expected = whatIfGrossChange(explorerScenario(DEFAULTS_2026), 1000);
    expect(expected.deltaTakeHome).toBe(720);
    expect(screen.getByTestId("take-home-delta-sentence").textContent).toBe(
      "Of the next £1,000 of pay, an estimated £720 is take-home: £200 Income Tax and £80 National Insurance.",
    );
    const outcomes = screen.getByTestId("explorer-outcomes");
    expect(outcomes.textContent).toContain("Estimated take-home from the next £1,000");
    expect(outcomes.textContent).toContain("£720");
    expect(outcomes.textContent).toContain("Estimated share deducted from the next £1,000");
    expect(screen.getByText("28%")).toBeDefined();
    // The 2026/27 rules are not yet signed off: the panel says so once, and the chart does not repeat it.
    const figure = screen.getByRole("figure", {
      name: "Estimated share deducted from the next £1,000, by pay before tax",
    });
    expect(within(figure).queryByText(/^Unverified estimate\. These tax figures/)).toBeNull();
    expect(screen.getAllByText(/^Unverified estimate\. These tax figures/)).toHaveLength(1);
  });

  it("draws the chart with thresholds and your pay", () => {
    render(<MarginalRateExplorerStandalone initialValues={{ taxYear: "2026/27" }} />);
    expect(
      screen.getByRole("figure", {
        name: "Estimated share deducted from the next £1,000, by pay before tax",
      }),
    ).toBeDefined();
    expect(screen.getAllByTestId("marginal-rate-threshold").length).toBeGreaterThan(3);
    expect(screen.getByTestId("marginal-rate-your-pay")).toBeDefined();
  });

  it("is controlled: inputs call onChange and never change values by themselves", () => {
    const onChange = vi.fn();
    render(<MarginalRateExplorer values={DEFAULTS_2026} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Pay before tax a year range slider"), {
      target: { value: "60000" },
    });
    expect(onChange).toHaveBeenCalledWith("grossPay", 60000);
  });

  it("pre-fills the extra pension at £1,000 and previews it", () => {
    render(<MarginalRateExplorerStandalone initialValues={{ taxYear: "2026/27" }} />);
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

  it("offers the year's student loan plans under More options, closed by default", () => {
    render(<MarginalRateExplorerStandalone initialValues={{ taxYear: "2026/27" }} />);
    expect(screen.queryByRole("group", { name: "Student loan plans" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "More options" }));
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

  it("drops a plan the chosen tax year does not have before it reaches the engine", () => {
    expect(
      explorerScenario({ ...DEFAULTS_2026, taxYear: "2022/23", studentLoans: "plan5+plan2" })
        .studentLoans,
    ).toEqual(["plan2"]);
    render(
      <MarginalRateExplorerStandalone
        initialValues={{ taxYear: "2026/27", studentLoans: "plan5" }}
      />,
    );
    const sentence = () => screen.getByTestId("take-home-delta-sentence").textContent;
    expect(sentence()).toContain("student loan");
    fireEvent.click(screen.getByRole("button", { name: "More options" }));
    fireEvent.change(screen.getByLabelText("Tax year"), { target: { value: "2022/23" } });
    expect(sentence()).not.toContain("student loan");
    expect(screen.queryByLabelText("Plan 5")).toBeNull();
  });

  it("keeps the extra pension slider when dragged to £0", () => {
    render(<MarginalRateExplorerStandalone initialValues={{ taxYear: "2026/27" }} />);
    fireEvent.click(screen.getByRole("button", { name: "Model a pension contribution" }));
    fireEvent.change(screen.getByLabelText("Extra pension contribution range slider"), {
      target: { value: "0" },
    });
    expect(screen.getByLabelText("Extra pension contribution range slider")).toBeDefined();
    expect(screen.queryByRole("button", { name: "Model a pension contribution" })).toBeNull();
  });

  it("closes the extra pension slider when the value is reset from outside", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <MarginalRateExplorer
        values={{ ...DEFAULTS_2026, extraPension: 1000 }}
        onChange={onChange}
      />,
    );
    expect(screen.getByLabelText("Extra pension contribution range slider")).toBeDefined();
    rerender(<MarginalRateExplorer values={DEFAULTS_2026} onChange={onChange} />);
    expect(screen.getByRole("button", { name: "Model a pension contribution" })).toBeDefined();
  });

  it("does not use a KpiStrip for scenario outcomes", () => {
    render(<MarginalRateExplorerStandalone initialValues={{ taxYear: "2026/27" }} />);
    expect(screen.getByTestId("explorer-outcomes").children).toHaveLength(3);
    expect(document.getElementById("marginal-rate-explorer")).not.toBeNull();
  });

  it("shows three inputs at most, with region and pension type under More options", () => {
    render(<MarginalRateExplorerStandalone initialValues={{ taxYear: "2026/27" }} />);
    // Gross pay, bonus and the "Model a pension contribution" button.
    expect(screen.getAllByRole("slider")).toHaveLength(2);
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(screen.queryByLabelText("Where you pay tax")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "More options" }));
    fireEvent.change(screen.getByLabelText("Where you pay tax"), {
      target: { value: "SCOTLAND" },
    });
    expect(screen.getByLabelText("Pension contribution type")).toBeDefined();
    expect(screen.getByTestId("take-home-delta-sentence").textContent).not.toContain(
      "£200 Income Tax",
    );
  });

  it("parses plan strings in a fixed order", () => {
    expect(parseStudentLoanPlans("postgrad+plan2+nonsense")).toEqual(["plan2", "postgrad"]);
    expect(parseStudentLoanPlans("")).toEqual([]);
  });
});
