import { ADVICE_PATTERNS } from "@flump/finance-engine";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { allCopyStrings, chartSummary, thresholdLabel } from "./copy";
import { TakeHomeDeltaPanel, type TakeHomeDeltaPanelProps } from "./TakeHomeDeltaPanel";

const base: TakeHomeDeltaPanelProps = {
  deltaGross: 1000,
  takeHome: 720,
  components: { incomeTax: 200, nationalInsurance: 80, studentLoan: 0, hicbc: 0, pension: 0 },
  ratesYear: "2026/27",
  calendarYear: "2026/27",
  isFallback: false,
  isUnverifiedEstimate: false,
  assumptions: [{ code: "annualMethod", unverified: false }],
};

const renderPanel = (props: Partial<TakeHomeDeltaPanelProps> = {}) =>
  render(<TakeHomeDeltaPanel {...base} {...props} />);

describe("TakeHomeDeltaPanel mergeDisclosures", () => {
  it("puts the table, the assumptions and the extra content in one closed disclosure", () => {
    renderPanel({ mergeDisclosures: true, disclosureExtra: <p>chart data</p> });
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.queryByRole("heading")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "How this is worked out" }));
    expect(screen.getByRole("table", { name: "Where the next £1,000 goes" })).toBeDefined();
    expect(screen.getByRole("listitem")).toBeDefined();
    expect(screen.getByText("chart data")).toBeDefined();
  });
});

describe("TakeHomeDeltaPanel", () => {
  it("lists the next £1,000 in the table only, leaving out zero parts", () => {
    renderPanel();
    // No sentence repeating the table and the headline card (RESCORE pay rise item 1).
    expect(screen.queryByTestId("take-home-delta-sentence")).toBeNull();
    expect(screen.queryByText(/Of the next £1,000 of pay/)).toBeNull();
    const rows = screen.getAllByRole("rowheader").map((r) => r.textContent);
    // No take-home row: the headline card already shows it.
    expect(rows).toEqual(["Income Tax", "National Insurance"]);
  });

  it("lists every non-zero part in order", () => {
    renderPanel({
      takeHome: 225,
      components: {
        incomeTax: 400,
        nationalInsurance: 20,
        studentLoan: 90,
        hicbc: 265,
        pension: 0,
      },
    });
    const rows = screen.getAllByRole("rowheader").map((r) => r.textContent);
    expect(rows).toEqual([
      "Income Tax",
      "National Insurance",
      "Student loan",
      "Child Benefit charge",
    ]);
  });

  it("leaves out negative parts as well as zero ones", () => {
    renderPanel({
      takeHome: 805,
      components: { incomeTax: -5, nationalInsurance: 80, studentLoan: 0, hicbc: 0, pension: 120 },
    });
    const rows = screen.getAllByRole("rowheader").map((r) => r.textContent);
    expect(rows).toEqual(["National Insurance", "Pension"]);
  });

  it("shows pence only when they matter", () => {
    renderPanel({
      takeHome: 719.5,
      components: { incomeTax: 200.5, nationalInsurance: 80, studentLoan: 0, hicbc: 0, pension: 0 },
    });
    // Take-home is not a row any more; a deduction with pence shows them on every row.
    expect(screen.getByText("£200.50")).toBeDefined();
    expect(screen.getByText("£80.00")).toBeDefined();
  });

  it("badges the tax year and an estimate", () => {
    renderPanel();
    expect(screen.getByText("As at tax year 2026/27")).toBeDefined();
    expect(screen.getByText("Estimate")).toBeDefined();
    expect(screen.queryByText("Unverified estimate")).toBeNull();
  });

  it("leaves out the tax year badge when the caller shows it", () => {
    renderPanel({ showTaxYearBadge: false });
    expect(screen.queryByText("As at tax year 2026/27")).toBeNull();
    expect(screen.getByText("Estimate")).toBeDefined();
  });

  it("shows Unverified estimate, the banner and (not yet confirmed) when unverified", () => {
    renderPanel({
      isUnverifiedEstimate: true,
      assumptions: [{ code: "childBenefitWeeks", unverified: true }],
    });
    // No badge: the full sentence is in the notice (P4.3).
    expect(screen.queryByText("Unverified estimate")).toBeNull();
    // One notice: the unverified sentence leads the guidance note, with no amber block.
    const notices = document.querySelectorAll("[data-notice]");
    expect(notices).toHaveLength(1);
    expect(notices[0]?.textContent).toMatch(
      /^Unverified estimate\. These tax figures have not yet been checked.*Guidance, not advice\./,
    );
    // No amber paragraph: the only warning colour left is the header badge.
    for (const p of Array.from(document.querySelectorAll("p"))) {
      expect(p.className).not.toContain("status.warning");
    }
    // The working sits in a closed quiet drawer.
    const drawer = screen.getByRole("button", { name: "How this is worked out" });
    expect(drawer.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(drawer);
    expect(screen.getByText("(not yet confirmed)")).toBeDefined();
    expect(screen.getByText(/Child Benefit is counted for 52 weeks a year/)).toBeDefined();
  });

  it("puts the explainer drawer above the notice", () => {
    renderPanel();
    const drawer = screen.getByRole("button", { name: "How this is worked out" });
    const notice = screen.getByTestId("projection-notice");
    expect(drawer.compareDocumentPosition(notice) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("can put the table in a closed quiet drawer with no heading or badges", () => {
    renderPanel({ collapseTable: true });
    const name = "Where the next £1,000 goes";
    expect(screen.queryByRole("table", { name })).toBeNull();
    expect(screen.queryByRole("heading")).toBeNull();
    expect(screen.queryByText("Estimate")).toBeNull();
    const toggle = screen.getByRole("button", { name });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(toggle);
    expect(screen.getAllByRole("rowheader").map((r) => r.textContent)).toEqual([
      "Income Tax",
      "National Insurance",
    ]);
  });

  it("uses tabular figures in the table", () => {
    renderPanel();
    const cells = screen.getAllByRole("cell");
    for (const cell of cells) expect(cell.className).toMatch(/tabular-nums|fv-num_tabular/);
  });

  it("leaves the guidance notice to the surrounding zone when asked", () => {
    renderPanel({ showNotice: false });
    expect(screen.queryByTestId("projection-notice")).toBeNull();
  });

  it("keeps the unverified sentence as quiet text, not a notice, when the zone owns the notice", () => {
    renderPanel({ showNotice: false, isUnverifiedEstimate: true });
    expect(document.querySelectorAll("[data-notice]")).toHaveLength(0);
    expect(screen.getByText(/These tax figures have not yet been checked/)).toBeDefined();
  });

  it("drops the unverified sentence when the page's one notice already leads with it", () => {
    renderPanel({ showNotice: false, isUnverifiedEstimate: true, unverifiedInPageNotice: true });
    expect(screen.queryByText(/These tax figures have not yet been checked/)).toBeNull();
    // The page's notice carries it, so no header badge repeats it either.
    expect(screen.queryByText("Unverified estimate")).toBeNull();
  });

  it("renders the guidance notice by default and the fallback banner when rates are older", () => {
    renderPanel({ isFallback: true, calendarYear: "2027/28" });
    expect(screen.getByTestId("projection-notice")).toBeDefined();
    expect(screen.getByText(/Using 2026\/27 rates/)).toBeDefined();
  });

  it("states the pension preview", () => {
    renderPanel({
      pensionPreview: { contribution: 1000, takeHomeChange: 720, reachesPension: 1000 },
    });
    expect(screen.getByTestId("take-home-delta-pension").textContent).toBe(
      "An extra £1,000 a year into your pension would lower take-home by an estimated £720, and £1,000 would reach your pension.",
    );
  });
});

describe("copy", () => {
  it("keeps the chart summary free of the rate the headline cards already show", () => {
    expect(chartSummary(true, "£150,000")).toBe(
      "Each step is a threshold where more of each extra pound is deducted.",
    );
    expect(chartSummary(true, "£150,000")).not.toMatch(/[0-9£%]/);
    expect(chartSummary(false, "£150,000")).toBe(
      "Your pay is above the £150,000 the chart goes up to.",
    );
  });

  it("labels thresholds from the data", () => {
    expect(
      thresholdLabel({ kind: "additionalRate", band: { name: "Additional", rate: 0.45 } }),
    ).toBe("Additional rate (45%)");
    expect(
      thresholdLabel({ kind: "scottishBand", band: { name: "Intermediate", rate: 0.21 } }),
    ).toBe("Intermediate rate (21%)");
    expect(thresholdLabel({ kind: "studentLoan", plan: "postgrad" })).toBe(
      "Postgraduate loan repayments start",
    );
  });

  it("has no advice wording", () => {
    const strings = allCopyStrings();
    expect(strings.length).toBeGreaterThan(50);
    const banned = /\b(escape|reclaim|save tax|optimal|should|recommend|best|only|just)\b/i;
    for (const s of strings) {
      expect(s, s).not.toMatch(banned);
      for (const p of ADVICE_PATTERNS) expect(s, `${p.id}: ${s}`).not.toMatch(p.pattern);
    }
  });
});
