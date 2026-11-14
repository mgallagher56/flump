import { getLatestSupportedUkTaxYear, whatIfGrossChange } from "@flump/finance-engine";
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
const CHART_TITLE = "Estimated share deducted from the next £1,000, by pay before tax";

/** The "Where the next £1,000 goes" breakdown table's text. */
const breakdown = () =>
  screen.getByRole("table", { name: "Where the next £1,000 goes" }).textContent ?? "";
const openMoreOptions = () => fireEvent.click(screen.getByRole("button", { name: "More options" }));
const modelPension = () => {
  openMoreOptions();
  fireEvent.click(screen.getByRole("button", { name: "Model a pension contribution" }));
};

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
    // Take-home shows once, in the card: the table lists only the deductions.
    expect(screen.queryByText(/Of the next £1,000 of pay/)).toBeNull();
    expect(breakdown()).not.toContain("£720");
    expect(breakdown()).toContain("£200");
    expect(breakdown()).toContain("£80");
    const outcomes = screen.getByTestId("explorer-outcomes");
    expect(outcomes.textContent).toContain("Estimated take-home from the next £1,000");
    expect(outcomes.textContent).toContain("£720");
    expect(outcomes.textContent).toContain("Estimated share deducted from the next £1,000");
    expect(outcomes.textContent).not.toContain("Estimated take-home a year");
    expect(within(outcomes).getByText("28%")).toBeDefined();
    // The 2026/27 rules are not yet signed off: the panel says so once, and the chart does not repeat it.
    const figure = screen.getByRole("figure", { name: CHART_TITLE });
    expect(within(figure).queryByText(/^Unverified estimate\. These tax figures/)).toBeNull();
    expect(screen.getAllByText(/^Unverified estimate\. These tax figures/)).toHaveLength(1);
  });

  it("draws the chart with thresholds and your pay, with a summary that repeats no figure", () => {
    render(<MarginalRateExplorerStandalone initialValues={{ taxYear: "2026/27" }} />);
    const figure = screen.getByRole("figure", { name: CHART_TITLE });
    expect(figure.getAttribute("aria-describedby")).toBeTruthy();
    const summaryId = figure.getAttribute("aria-describedby") ?? "";
    expect(document.getElementById(summaryId)?.textContent).toBe(
      "Each step is a threshold where more of each extra pound is deducted.",
    );
    expect(screen.getAllByTestId("marginal-rate-threshold").length).toBeGreaterThan(3);
    expect(screen.getByTestId("marginal-rate-your-pay")).toBeDefined();
  });

  it("sits in one outer card when standalone", () => {
    render(<MarginalRateExplorerStandalone initialValues={{ taxYear: "2026/27" }} />);
    const card = screen.getByTestId("pay-rise-tool");
    expect(card.contains(screen.getByTestId("marginal-rate-explorer"))).toBe(true);
  });

  it("hides no sign-up button unless a caller asks for one", () => {
    render(<MarginalRateExplorerStandalone initialValues={{ taxYear: "2026/27" }} />);
    expect(screen.queryByRole("button", { name: /sign up|invite/i })).toBeNull();
  });

  it("shows the sign-up button under the headline result and pre-fills the pay entered", () => {
    const onSave = vi.fn();
    render(
      <MarginalRateExplorerStandalone
        ctaText="Request an invite →"
        initialValues={{ taxYear: "2026/27" }}
        persistSeed={false}
        onSaveAndContinue={onSave}
      />,
    );
    const cta = screen.getByRole("button", { name: "Request an invite" });
    const outcomes = screen.getByTestId("explorer-outcomes");
    const figure = screen.getByRole("figure", { name: CHART_TITLE });
    expect(outcomes.compareDocumentPosition(cta) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(cta.compareDocumentPosition(figure) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.click(cta);
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ annualIncome: 39_000 }));
  });

  it("uses h2 section headings when embedded, h3 otherwise, and headingLevel overrides", () => {
    const { container, unmount } = render(
      <MarginalRateExplorerStandalone embedded initialValues={{ taxYear: "2026/27" }} />,
    );
    const levels = () =>
      [...container.querySelectorAll("h1, h2, h3, h4, h5, h6")].map((h) => h.tagName);
    expect(new Set(levels())).toEqual(new Set(["H2"]));
    expect(screen.getByRole("heading", { level: 2, name: CHART_TITLE })).toBeDefined();
    unmount();
    render(<MarginalRateExplorerStandalone initialValues={{ taxYear: "2026/27" }} />);
    expect(screen.getByRole("heading", { level: 3, name: CHART_TITLE })).toBeDefined();
  });

  it("shows the fallback-rates banner when today's tax year has no rates yet", () => {
    const latest = getLatestSupportedUkTaxYear();
    const now = new Date(Date.UTC(Number(latest.slice(0, 4)) + 1, 5, 1));
    render(<MarginalRateExplorerStandalone now={now} />);
    expect(screen.getByTestId("tax-rates-status-banner").textContent).toContain(
      `Using ${latest} rates`,
    );
  });

  it("shows no fallback banner when today's tax year has its own rates", () => {
    render(<MarginalRateExplorerStandalone now={new Date(Date.UTC(2026, 5, 1))} />);
    expect(screen.queryByTestId("tax-rates-status-banner")).toBeNull();
  });

  it("is controlled: inputs call onChange and never change values by themselves", () => {
    const onChange = vi.fn();
    render(<MarginalRateExplorer values={DEFAULTS_2026} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Pay before tax a year"), {
      target: { value: "60000" },
    });
    expect(onChange).toHaveBeenCalledWith("grossPay", 60000);
  });

  it("pre-fills the extra pension at £1,000 and previews it", () => {
    render(<MarginalRateExplorerStandalone initialValues={{ taxYear: "2026/27" }} />);
    // Inside More options, not a second full button beside it.
    expect(screen.queryByRole("button", { name: "Model a pension contribution" })).toBeNull();
    modelPension();
    const pill = screen.getByLabelText("Extra pension contribution input") as HTMLInputElement;
    expect(pill.value).toBe("£1,000");
    expect(screen.getByTestId("take-home-delta-pension").textContent).toBe(
      "An extra £1,000 a year into your pension would lower take-home by an estimated £720, and £1,000 would reach your pension.",
    );
    fireEvent.click(screen.getByRole("button", { name: "How this is worked out" }));
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
    expect(breakdown()).toContain("Student loan");
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
    expect(breakdown()).toContain("Student loan");
    openMoreOptions();
    fireEvent.change(screen.getByLabelText("Tax year"), { target: { value: "2022/23" } });
    expect(breakdown()).not.toContain("Student loan");
    expect(screen.queryByLabelText("Plan 5")).toBeNull();
  });

  it("keeps the extra pension slider when dragged to £0", () => {
    render(<MarginalRateExplorerStandalone initialValues={{ taxYear: "2026/27" }} />);
    modelPension();
    fireEvent.change(screen.getByLabelText("Extra pension contribution"), {
      target: { value: "0" },
    });
    expect(screen.getByLabelText("Extra pension contribution")).toBeDefined();
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
    // More options opens itself when an extra pension is already set.
    expect(screen.getByLabelText("Extra pension contribution")).toBeDefined();
    rerender(<MarginalRateExplorer values={DEFAULTS_2026} onChange={onChange} />);
    expect(screen.getByRole("button", { name: "Model a pension contribution" })).toBeDefined();
  });

  it("does not use a KpiStrip for scenario outcomes", () => {
    render(<MarginalRateExplorerStandalone initialValues={{ taxYear: "2026/27" }} />);
    // One outcome and one supporting figure; take-home a year answers a different question.
    expect(screen.getByTestId("explorer-outcomes").children).toHaveLength(2);
    expect(document.getElementById("marginal-rate-explorer")).not.toBeNull();
  });

  it("shows two inputs, with region, pension type and the extra pension under More options", () => {
    render(<MarginalRateExplorerStandalone initialValues={{ taxYear: "2026/27" }} />);
    // Gross pay and bonus.
    expect(screen.getAllByRole("slider")).toHaveLength(2);
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(screen.queryByLabelText("Where you pay tax")).toBeNull();
    openMoreOptions();
    const before = breakdown();
    fireEvent.change(screen.getByLabelText("Where you pay tax"), {
      target: { value: "SCOTLAND" },
    });
    expect(screen.getByLabelText("Pension contribution type")).toBeDefined();
    expect(breakdown()).not.toBe(before);
  });

  it("parses plan strings in a fixed order", () => {
    expect(parseStudentLoanPlans("postgrad+plan2+nonsense")).toEqual(["plan2", "postgrad"]);
    expect(parseStudentLoanPlans("")).toEqual([]);
  });
});
