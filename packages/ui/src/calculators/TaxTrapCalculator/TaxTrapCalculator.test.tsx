import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ADVICE_PATTERNS,
  getLatestSupportedUkTaxYear,
  whatIfGrossChange,
  whatIfSacrificeChange,
} from "@flump/finance-engine";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DELTA_PANEL_COPY } from "../../patterns/TakeHomeDeltaPanel/copy";
import { formatMoney } from "../../primitives/Money/Money";
import { allTaxTrapCopyStrings, factLine, TAX_TRAP_COPY } from "./copy";
import { TaxTrapCalculator } from "./TaxTrapCalculator";

/** Opens "Show details", where the table, taper, childcare and working now live. */
const openDetails = () =>
  fireEvent.click(screen.getByRole("button", { name: TAX_TRAP_COPY.details }));

const outcome = (label: string) => {
  const cards = within(screen.getByTestId("tax-trap-outcomes"));
  const labelEl = cards.getByText(label);
  // The card is the parent of the label row (KpiCard marks that row data-kpi-eyebrow).
  return labelEl.closest("[data-kpi-eyebrow]")?.parentElement?.textContent;
};

describe("TaxTrapCalculator", () => {
  it("shows the engine's figures for the default example", () => {
    render(<TaxTrapCalculator taxYear="2026/27" />);
    const expected = whatIfSacrificeChange(
      { taxYear: "2026/27", region: "ENGLAND_NI_WALES", salary: 115_000 },
      10_000,
    );
    // The headline figure is the reduction in take-home pay, as a positive amount.
    expect(outcome(TAX_TRAP_COPY.kpiTakeHomeReduction)).toContain(
      formatMoney(-expected.deltaTakeHome).text,
    );
    expect(outcome(TAX_TRAP_COPY.kpiTakeHomeReduction)).toContain(TAX_TRAP_COPY.kpiTakeHomeSubtext);
    // The tax and NI change is a positive amount under a "reduction" label: no minus sign.
    const taxAndNi = expected.components.incomeTax + expected.components.nationalInsurance;
    expect(outcome(TAX_TRAP_COPY.kpiTaxAndNiReduction)).toContain(
      formatMoney(Math.abs(taxAndNi)).text,
    );
    expect(screen.getByTestId("tax-trap-outcomes").textContent).not.toMatch(/[-−]£|£[-−]/);
    // The Personal Allowance is in the details table, not a third card (first view at most 3 figures).
    expect(screen.queryByText(TAX_TRAP_COPY.kpiPersonalAllowance)).toBeNull();
    expect(screen.queryByRole("table")).toBeNull();
    openDetails();
    const table = screen.getByRole("table", { name: TAX_TRAP_COPY.factsCaption });
    expect(table.textContent).toContain(formatMoney(expected.after.personalAllowance).text);
    expect(table.textContent).toContain(formatMoney(expected.before.adjustedNetIncome).text);
    expect(table.textContent).toContain(formatMoney(expected.after.adjustedNetIncome).text);
  });

  it("shows the share deducted from the next £1,000 from the engine, before and after", () => {
    render(<TaxTrapCalculator taxYear="2026/27" />);
    const s = { taxYear: "2026/27", region: "ENGLAND_NI_WALES" as const, salary: 115_000 };
    const before = whatIfGrossChange(s, 1000).effectiveMarginalRatePct;
    const after = whatIfGrossChange(
      { ...s, pension: { method: "salary-sacrifice", amount: 10_000 } },
      1000,
    ).effectiveMarginalRatePct;
    openDetails();
    const row = screen.getByRole("row", { name: new RegExp(TAX_TRAP_COPY.factNextThousand) });
    expect(row.textContent).toContain(`${Math.round(before)}%`);
    expect(row.textContent).toContain(`${Math.round(after)}%`);
  });

  it("recomputes when the region changes", () => {
    render(<TaxTrapCalculator taxYear="2026/27" />);
    openDetails();
    const table = screen.getByRole("table", { name: TAX_TRAP_COPY.factsCaption });
    const englandText = table.textContent;
    fireEvent.change(screen.getByLabelText(TAX_TRAP_COPY.region), {
      target: { value: "SCOTLAND" },
    });
    const scot = whatIfSacrificeChange(
      { taxYear: "2026/27", region: "SCOTLAND", salary: 115_000 },
      10_000,
    );
    expect(table.textContent).not.toBe(englandText);
    expect(table.textContent).toContain(formatMoney(scot.after.takeHome).text);
  });

  it("shows £0 under a change label, with no figure in the subtext, when there is no contribution", () => {
    render(<TaxTrapCalculator initialContribution={0} taxYear="2026/27" />);
    expect(outcome(TAX_TRAP_COPY.kpiTakeHomeChange)).toContain("£0");
    expect(outcome(TAX_TRAP_COPY.kpiTakeHomeChange)).toContain(TAX_TRAP_COPY.noContribution);
    expect(outcome(TAX_TRAP_COPY.kpiTaxAndNiChange)).toContain("£0");
    for (const s of [
      TAX_TRAP_COPY.kpiTakeHomeSubtext,
      TAX_TRAP_COPY.noContribution,
      TAX_TRAP_COPY.kpiTakeHomeReduction,
      TAX_TRAP_COPY.kpiTaxAndNiReduction,
    ]) {
      expect(s).not.toMatch(/[0-9£%]/);
    }
  });

  it("names the taper threshold from the engine rules, never as the taper start", () => {
    render(<TaxTrapCalculator taxYear="2026/27" />);
    openDetails();
    expect(screen.getByTestId("tax-trap-fact-line").textContent).toContain(
      "Above £100,000 of adjusted net income",
    );
    expect(screen.getByTestId("tax-trap-taper-note").textContent).toContain(
      "adjusted net income over £100,000",
    );
    expect(screen.getByTestId("tax-trap-calculator-tool").textContent).not.toMatch(/taper start/i);
  });

  it("labels figures as an unverified estimate until the vectors are signed", () => {
    render(<TaxTrapCalculator taxYear="2026/27" />);
    const r = whatIfSacrificeChange(
      { taxYear: "2026/27", region: "ENGLAND_NI_WALES", salary: 115_000 },
      10_000,
    );
    const notice = screen.getByTestId("projection-notice").textContent ?? "";
    // No badge repeats it: the one notice carries the full sentence.
    expect(screen.queryByText("Unverified estimate")).toBeNull();
    if (r.after.isUnverifiedEstimate) {
      expect(notice.startsWith(DELTA_PANEL_COPY.unverifiedBanner)).toBe(true);
    } else {
      expect(notice).not.toContain(DELTA_PANEL_COPY.unverifiedBanner);
    }
    expect(screen.getByText("As at tax year 2026/27")).toBeDefined();
  });

  it("states the childcare limit as a fact, from adjusted net income after the contribution", () => {
    render(<TaxTrapCalculator initialContribution={0} taxYear="2026/27" />);
    openDetails();
    expect(screen.getByTestId("tax-trap-childcare-status").textContent).toContain("over £100,000");
    fireEvent.change(screen.getByRole("slider", { name: TAX_TRAP_COPY.contribution }), {
      target: { value: "20000" },
    });
    expect(screen.getByTestId("tax-trap-childcare-status").textContent).toContain(
      "£100,000 or less",
    );
  });

  it("has three visible inputs, one outcome with one supporting figure, and exactly one notice", () => {
    render(<TaxTrapCalculator taxYear="2026/27" />);
    expect(screen.getAllByRole("slider").length + screen.getAllByRole("combobox").length).toBe(3);
    expect(screen.getByTestId("tax-trap-outcomes").children).toHaveLength(2);
    expect(screen.getAllByTestId("projection-notice")).toHaveLength(1);
    expect(screen.queryByTestId("tax-rates-status-banner")).toBeNull();
  });

  it("explains the rates year, beside the one notice, only when the rates are a fallback year", () => {
    // A date in the tax year after the latest one the engine has rates for.
    const latest = getLatestSupportedUkTaxYear();
    const now = new Date(Date.UTC(Number(latest.slice(0, 4)) + 1, 5, 1));
    render(<TaxTrapCalculator now={now} />);
    const banner = screen.getByTestId("tax-rates-status-banner");
    expect(banner.textContent).toContain(`Using ${latest} rates`);
    expect(screen.getAllByTestId("projection-notice")).toHaveLength(1);
  });

  it("shows no fallback banner when today's tax year has its own rates", () => {
    render(<TaxTrapCalculator now={new Date(Date.UTC(2026, 5, 1))} />);
    expect(screen.queryByTestId("tax-rates-status-banner")).toBeNull();
  });

  it("puts the sign-up button under the results and keeps the taper facts in the details", () => {
    render(<TaxTrapCalculator />);
    const cta = screen.getByRole("button", { name: "Continue to sign up" });
    const outcomes = screen.getByTestId("tax-trap-outcomes");
    expect(outcomes.compareDocumentPosition(cta) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByTestId("tax-trap-fact-line")).toBeNull();
    expect(screen.queryByTestId("tax-trap-taper-note")).toBeNull();
    expect(screen.queryByTestId("tax-trap-childcare-status")).toBeNull();
    openDetails();
    expect(screen.getByTestId("tax-trap-fact-line").textContent).toBe(factLine("£100,000"));
  });

  it("shows the tax year once, at the top of the results above the outcome cards", () => {
    render(<TaxTrapCalculator embedded taxYear="2026/27" />);
    const badges = screen.getAllByText("As at tax year 2026/27");
    expect(badges).toHaveLength(1);
    const outcomes = screen.getByTestId("tax-trap-outcomes");
    expect(
      badges[0]?.compareDocumentPosition(outcomes) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("hides its own title when embedded, with no skipped heading level", () => {
    const { container } = render(<TaxTrapCalculator embedded taxYear="2026/27" />);
    expect(screen.queryByText(TAX_TRAP_COPY.title)).toBeNull();
    openDetails();
    const levels = [...container.querySelectorAll("h1, h2, h3, h4, h5, h6")].map((h) =>
      Number(h.tagName[1]),
    );
    expect(levels[0]).toBe(2);
    for (let i = 1; i < levels.length; i++) {
      expect((levels[i] ?? 0) - (levels[i - 1] ?? 0)).toBeLessThanOrEqual(1);
    }
  });

  it("never passes a negative entry to the engine", () => {
    render(
      <TaxTrapCalculator initialContribution={-5000} initialGrossIncome={-1} taxYear="2026/27" />,
    );
    const text = screen.getByTestId("tax-trap-calculator-tool").textContent ?? "";
    expect(text).not.toMatch(/£-|-£|−£/);
  });

  it("makes the facts table a focusable, named region when it scrolls sideways (D16)", () => {
    const width = vi
      .spyOn(HTMLElement.prototype, "scrollWidth", "get")
      .mockImplementation(function (this: HTMLElement) {
        return this.querySelector("table") ? 900 : 0;
      });
    try {
      render(<TaxTrapCalculator taxYear="2026/27" />);
      openDetails();
      const region = screen.getByRole("region", { name: TAX_TRAP_COPY.factsCaption });
      expect(region.getAttribute("tabindex")).toBe("0");
      expect(within(region).getByRole("table")).toBeDefined();
    } finally {
      width.mockRestore();
    }
  });

  it("shows one arrow on the sign-up button when the caller's label has its own", () => {
    render(<TaxTrapCalculator ctaText="Request an invite →" />);
    expect(screen.getByRole("button", { name: "Request an invite" })).toBeDefined();
  });

  it("never leads with the £100,000 line", () => {
    expect(TAX_TRAP_COPY.title).not.toMatch(/100/);
  });

  it("announces the outcome through a single live region", () => {
    render(<TaxTrapCalculator />);
    expect(screen.getAllByRole("status")).toHaveLength(1);
  });

  it("pre-fills sign-up with the entered income only", () => {
    const onSave = vi.fn();
    render(<TaxTrapCalculator ctaText="Continue" persistSeed={false} onSaveAndContinue={onSave} />);
    fireEvent.click(screen.getByRole("button", { name: /Continue/ }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ annualIncome: 115000 }));
    const payload = onSave.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(payload).not.toHaveProperty("mortgageBalance");
    expect(payload).not.toHaveProperty("initialCashSavings");
  });

  it("has no inline styles of its own (SliderField sets only its fill variable)", () => {
    const { container } = render(<TaxTrapCalculator />);
    for (const el of container.querySelectorAll("[style]")) {
      expect(el.getAttribute("style")).toMatch(/^--slider-fill: [\d.]+%;$/);
    }
  });

  it("holds no tax rates of its own", () => {
    const dir = __dirname;
    const src = ["TaxTrapCalculator.tsx", "TaxTrapCalculator.styles.ts", "copy.ts"]
      .map((f) => readFileSync(join(dir, f), "utf8"))
      .join("\n");
    expect(src).not.toMatch(/0\.62|0\.42|62\.0%|42\.0%|rgba\(|calculateTaxTrapRelief/);
  });

  it("has no advice wording", () => {
    const banned =
      /\b(escape|reclaim|save tax|saved|optimal|should|recommend|best|guarantee[ds]?|trap)\b/i;
    for (const s of allTaxTrapCopyStrings()) {
      expect(s, s).not.toMatch(banned);
      for (const p of ADVICE_PATTERNS) expect(s, `${p.id}: ${s}`).not.toMatch(p.pattern);
    }
  });
});

describe("TaxTrapCalculator inputs and figures", () => {
  const nextRow = () =>
    screen.getByRole("row", { name: new RegExp(TAX_TRAP_COPY.factNextThousand) }).textContent;
  const slider = (name: string) => screen.getByRole("slider", { name }) as HTMLInputElement;

  it("uses a supported tax year it is given, and the rates year for one it does not know", () => {
    const now = new Date(Date.UTC(2026, 5, 1));
    const { unmount } = render(<TaxTrapCalculator now={now} taxYear="2025/26" />);
    expect(screen.getByText("As at tax year 2025/26")).toBeDefined();
    unmount();
    render(<TaxTrapCalculator now={now} taxYear="1999/00" />);
    expect(screen.getByText("As at tax year 2026/27")).toBeDefined();
  });

  it("shows no fallback banner when an earlier year is chosen in a fallback year", () => {
    const latest = getLatestSupportedUkTaxYear();
    const now = new Date(Date.UTC(Number(latest.slice(0, 4)) + 1, 5, 1));
    render(<TaxTrapCalculator now={now} taxYear="2025/26" />);
    expect(screen.queryByTestId("tax-rates-status-banner")).toBeNull();
  });

  it("caps the contribution at the pay entered", () => {
    render(<TaxTrapCalculator initialContribution={10_000} initialGrossIncome={6_000} />);
    const contribution = slider(TAX_TRAP_COPY.contribution);
    expect(contribution.max).toBe("6000");
    expect(contribution.value).toBe("6000");
  });

  it("follows the pay and the contribution in the next £1,000 row, with one decimal when needed", () => {
    render(
      <TaxTrapCalculator
        initialContribution={15_000}
        initialGrossIncome={110_000}
        taxYear="2026/27"
      />,
    );
    openDetails();
    // Before: £110,000 to £111,000 is in the taper, 40% tax + 20% lost allowance + 2% NI = 62%.
    // After £15,000 sacrifice: £95,000 to £96,000 is higher rate, 40% tax + 2% NI = 42%.
    expect(nextRow()).toMatch(/62%.*42%/);
    fireEvent.change(slider(TAX_TRAP_COPY.contribution), { target: { value: "0" } });
    fireEvent.change(slider(TAX_TRAP_COPY.grossIncome), { target: { value: "124500" } });
    // £124,500 to £125,140 at 62% = £396.80; £125,140 to £125,500 at 45% tax + 2% NI = £169.20.
    // £566 of £1,000 is 56.6%, shown before and after (no contribution).
    expect(nextRow()).toMatch(/56\.6%.*56\.6%/);
  });

  it("counts adjusted net income of exactly £100,000 as £100,000 or less for childcare", () => {
    render(
      <TaxTrapCalculator
        initialContribution={10_000}
        initialGrossIncome={110_000}
        taxYear="2026/27"
      />,
    );
    openDetails();
    // £110,000 pay less a £10,000 sacrifice is £100,000 adjusted net income.
    expect(screen.getByTestId("tax-trap-childcare-status").textContent).toContain(
      "£100,000 or less",
    );
  });

  it("lists the engine's assumptions in words under How this is worked out", () => {
    render(<TaxTrapCalculator taxYear="2026/27" />);
    openDetails();
    const heading = screen.getByRole("heading", { name: TAX_TRAP_COPY.assumptionsHeading });
    const items = [...(heading.parentElement?.querySelectorAll("li") ?? [])].map(
      (li) => li.textContent,
    );
    expect(items).toEqual([
      "Worked out on a full year's pay, not pay period by pay period.",
      "The pension contribution is modelled as salary sacrifice.",
    ]);
  });

  it("offers both regions", () => {
    render(<TaxTrapCalculator taxYear="2026/27" />);
    const options = [
      ...(screen.getByLabelText(TAX_TRAP_COPY.region) as HTMLSelectElement).options,
    ].map((o) => [o.value, o.textContent]);
    expect(options).toEqual([
      ["ENGLAND_NI_WALES", "England, Wales or Northern Ireland"],
      ["SCOTLAND", "Scotland"],
    ]);
  });

  it("asks onboarding for the tax and pension modules", () => {
    const onSave = vi.fn();
    render(<TaxTrapCalculator ctaText="Continue" persistSeed={false} onSaveAndContinue={onSave} />);
    fireEvent.click(screen.getByRole("button", { name: /Continue/ }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ inferredModules: ["tax", "pension"] }),
    );
  });
});

describe("allTaxTrapCopyStrings", () => {
  it("collects every string, nested ones included, for the copy guard", () => {
    const all = allTaxTrapCopyStrings();
    expect(all[0]).toBe(TAX_TRAP_COPY.title);
    expect(all).toContain(TAX_TRAP_COPY.regionOptions.SCOTLAND);
    expect(all).toContain(
      "With this contribution, adjusted net income is an estimated £105,000: over £100,000.",
    );
    expect(all).toContain(
      "With this contribution, adjusted net income is an estimated £95,000: £100,000 or less.",
    );
    expect(all.every((s) => typeof s === "string")).toBe(true);
  });
});

describe("TaxTrapCalculator outcome captions", () => {
  it("gives both outcome cards a caption with no figure", () => {
    render(<TaxTrapCalculator />);
    const outcomes = screen.getByTestId("tax-trap-outcomes");
    expect(outcomes.textContent).toContain(TAX_TRAP_COPY.kpiTakeHomeSubtext);
    expect(outcomes.textContent).toContain(TAX_TRAP_COPY.kpiTaxAndNiSubtext);
    expect(TAX_TRAP_COPY.kpiTaxAndNiSubtext).not.toMatch(/\d|£|%/);
    expect(TAX_TRAP_COPY.noContributionTaxAndNi).not.toMatch(/\d|£|%/);
  });
});

describe("TaxTrapCalculator in 2027/28 (Scottish rates not published)", () => {
  it("shows the refusal line in place of the results for Scotland, and England still works", () => {
    render(
      <TaxTrapCalculator
        initialRegion="SCOTLAND"
        now={new Date("2027-05-01T12:00:00Z")}
        persistSeed={false}
        taxYear="2027/28"
      />,
    );
    expect(
      screen.getByText(
        "Scottish Income Tax rates for 2027/28 are not published yet, so there is no estimate for this year.",
      ),
    ).toBeDefined();
    expect(screen.queryByTestId("tax-trap-outcomes")).toBeNull();
    fireEvent.change(screen.getByLabelText(TAX_TRAP_COPY.region), {
      target: { value: "ENGLAND_NI_WALES" },
    });
    expect(screen.getByTestId("tax-trap-outcomes")).toBeDefined();
  });
});
