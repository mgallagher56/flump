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
import { allTaxTrapCopyStrings, outcomeHeadline, TAX_TRAP_COPY } from "./copy";
import { TaxTrapCalculator } from "./TaxTrapCalculator";

/** Opens "Show details", where the table, taper, childcare and working now live. */
const openDetails = () =>
  fireEvent.click(screen.getByRole("button", { name: TAX_TRAP_COPY.details }));

const outcome = (label: string) => {
  const cards = within(screen.getByTestId("tax-trap-outcomes"));
  const labelEl = cards.getByText(label);
  return (labelEl.closest("[data-testid='kpi-card']") ?? labelEl.parentElement?.parentElement)
    ?.textContent;
};

describe("TaxTrapCalculator", () => {
  it("shows the engine's figures for the default example", () => {
    render(<TaxTrapCalculator taxYear="2026/27" />);
    const expected = whatIfSacrificeChange(
      { taxYear: "2026/27", region: "ENGLAND_NI_WALES", salary: 115_000 },
      10_000,
    );
    // A contribution is framed as what reaches the pension and what it costs, not as a loss.
    expect(screen.getByTestId("tax-trap-headline").textContent).toBe(
      outcomeHeadline(
        formatMoney(expected.deltaPensionGross).text,
        formatMoney(-expected.deltaTakeHome).text,
      ),
    );
    expect(outcome(TAX_TRAP_COPY.kpiPersonalAllowance)).toContain(
      formatMoney(expected.after.personalAllowance).text,
    );
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

  it("labels figures as an unverified estimate until the vectors are signed", () => {
    render(<TaxTrapCalculator taxYear="2026/27" />);
    const r = whatIfSacrificeChange(
      { taxYear: "2026/27", region: "ENGLAND_NI_WALES", salary: 115_000 },
      10_000,
    );
    const notice = screen.getByTestId("projection-notice").textContent ?? "";
    if (r.after.isUnverifiedEstimate) {
      expect(screen.getAllByText(TAX_TRAP_COPY.unverifiedBadge)).toHaveLength(1);
      // The one notice leads with the full unverified estimate sentence, matching the badge.
      expect(notice.startsWith(DELTA_PANEL_COPY.unverifiedBanner)).toBe(true);
    } else {
      expect(screen.queryByText(TAX_TRAP_COPY.unverifiedBadge)).toBeNull();
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

  it("has three visible inputs, one outcome with two supporting figures, and exactly one notice", () => {
    render(<TaxTrapCalculator taxYear="2026/27" />);
    expect(screen.getAllByRole("slider").length + screen.getAllByRole("combobox").length).toBe(3);
    expect(screen.getByTestId("tax-trap-outcomes").children).toHaveLength(3);
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

  it("puts the sign-up button under the results and keeps one factual line outside the details", () => {
    render(<TaxTrapCalculator />);
    const cta = screen.getByRole("button", { name: "Continue to sign up" });
    const outcomes = screen.getByTestId("tax-trap-outcomes");
    expect(outcomes.compareDocumentPosition(cta) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByTestId("tax-trap-fact-line").textContent).toBe(TAX_TRAP_COPY.factLine);
    expect(screen.getByTestId("tax-trap-fact-line").textContent).not.toMatch(/\d/);
    expect(screen.queryByTestId("tax-trap-taper-note")).toBeNull();
    expect(screen.queryByTestId("tax-trap-childcare-status")).toBeNull();
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
