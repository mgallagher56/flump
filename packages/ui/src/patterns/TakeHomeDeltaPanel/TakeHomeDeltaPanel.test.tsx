import { ADVICE_PATTERNS } from "@flump/finance-engine";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { allCopyStrings, deltaSentence, joinParts, thresholdLabel } from "./copy";
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

describe("TakeHomeDeltaPanel", () => {
  it("states the next £1,000 and leaves out zero parts", () => {
    renderPanel();
    expect(screen.getByTestId("take-home-delta-sentence").textContent).toBe(
      "Of the next £1,000 of pay, an estimated £720 is take-home: £200 Income Tax and £80 National Insurance.",
    );
    const rows = screen.getAllByRole("rowheader").map((r) => r.textContent);
    expect(rows).toEqual(["Take-home", "Income Tax", "National Insurance"]);
  });

  it("lists every part in order with commas and a final and", () => {
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
    expect(screen.getByTestId("take-home-delta-sentence").textContent).toBe(
      "Of the next £1,000 of pay, an estimated £225 is take-home: £400 Income Tax, £20 National Insurance, £90 student loan and £265 Child Benefit charge.",
    );
  });

  it("leaves out negative parts as well as zero ones", () => {
    renderPanel({
      takeHome: 805,
      components: { incomeTax: -5, nationalInsurance: 80, studentLoan: 0, hicbc: 0, pension: 120 },
    });
    const sentence = screen.getByTestId("take-home-delta-sentence").textContent ?? "";
    expect(sentence).not.toContain("Income Tax");
    expect(sentence).toContain("£80 National Insurance and £120 pension");
  });

  it("shows pence only when they matter", () => {
    renderPanel({
      takeHome: 719.5,
      components: { incomeTax: 200.5, nationalInsurance: 80, studentLoan: 0, hicbc: 0, pension: 0 },
    });
    expect(screen.getByTestId("take-home-delta-sentence").textContent).toContain("£719.50");
  });

  it("badges the tax year and an estimate", () => {
    renderPanel();
    expect(screen.getByText("As at tax year 2026/27")).toBeDefined();
    expect(screen.getByText("Estimate")).toBeDefined();
    expect(screen.queryByText("Unverified estimate")).toBeNull();
  });

  it("shows Unverified estimate, the banner and (not yet confirmed) when unverified", () => {
    renderPanel({
      isUnverifiedEstimate: true,
      assumptions: [{ code: "childBenefitWeeks", unverified: true }],
    });
    expect(screen.getByText("Unverified estimate")).toBeDefined();
    expect(screen.getByText(/These tax figures have not yet been checked/)).toBeDefined();
    expect(screen.getByText("(not yet confirmed)")).toBeDefined();
    expect(screen.getByText(/Child Benefit is counted for 52 weeks a year/)).toBeDefined();
  });

  it("uses tabular figures in the sentence and the table", () => {
    renderPanel();
    expect(screen.getByTestId("take-home-delta-sentence").className).toMatch(
      /tabular-nums|fv-num_tabular/,
    );
    const cells = screen.getAllByRole("cell");
    for (const cell of cells) expect(cell.className).toMatch(/tabular-nums|fv-num_tabular/);
  });

  it("always renders the guidance notice and the fallback banner when rates are older", () => {
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
  it("joins parts with commas and a final and", () => {
    expect(joinParts(["a"])).toBe("a");
    expect(joinParts(["a", "b"])).toBe("a and b");
    expect(joinParts(["a", "b", "c"])).toBe("a, b and c");
    expect(deltaSentence("£1,000", "£1,000", [])).toBe(
      "Of the next £1,000 of pay, an estimated £1,000 is take-home.",
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
