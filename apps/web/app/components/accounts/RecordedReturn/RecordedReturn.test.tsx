import { estimateRecordedReturn } from "@flump/finance-engine";
import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import customRender from "~/testUtils/customRender";
import RecordedReturn, {
  formatReturn,
  overallLabel,
  recordedReturnBalances,
  yearLabel,
} from "./RecordedReturn";

const HEADING = "Estimated return from your recorded balances";

describe("formatReturn", () => {
  it("formats fractions as en-GB percentages to 1 decimal place", () => {
    expect(formatReturn(0.0412)).toBe("4.1%");
    expect(formatReturn(-0.05)).toBe("-5.0%");
    // -0.0004 rounds to 0.0%: no "-0.0%".
    expect(formatReturn(-0.0004)).toBe("0.0%");
  });
});

describe("recordedReturnBalances", () => {
  it("uses recorded months up to now only", () => {
    expect(
      recordedReturnBalances([
        { month: 1, year: 2026, value: "100" },
        { month: 1, year: 2999, value: 100 },
        { month: 2, year: 2026, value: "not a number" },
      ]),
    ).toEqual([{ month: 1, year: 2026, value: 100 }]);
  });

  it('leaves out "No change" months, so they never read as 0% growth', () => {
    // Recorded January 2024 to January 2025, growing 1% a month from £10,000: 13 balances, 12
    // measured months, total 1.01^12 - 1 = 12.68%. Then February 2025 to January 2026 confirmed
    // "No change" at the last balance. Counted as 0% months, the overall figure would be 24
    // months annualised, 1.1268^(12/24) - 1 = 6.15%. Left out, it is the 12 months: 12.68%.
    const recorded = Array.from({ length: 13 }, (_, i) => ({
      year: 2024 + Math.floor(i / 12),
      month: (i % 12) + 1,
      value: 10_000 * 1.01 ** i,
      source: "manual",
    }));
    const last = recorded[12]?.value ?? 0;
    const confirmed = Array.from({ length: 12 }, (_, i) => ({
      year: 2025 + Math.floor((i + 1) / 12),
      month: ((i + 1) % 12) + 1,
      value: last,
      source: "confirmed",
    }));
    const balances = recordedReturnBalances([...recorded, ...confirmed]);
    expect(balances).toHaveLength(13);
    const result = estimateRecordedReturn({ balances, monthlyContribution: null });
    if (result.status !== "ok") throw new Error(`expected ok, got ${result.status}`);
    expect(result.overall.months).toBe(12);
    expect(result.overall.return).toBeCloseTo(0.1268, 4);
  });
});

describe("labels", () => {
  it("names a part year by its months and the overall figure by its period", () => {
    expect(yearLabel(2025, 12)).toBe("2025");
    expect(yearLabel(2024, 1)).toBe("2024 (1 month)");
    expect(yearLabel(2024, 5)).toBe("2024 (5 months)");
    expect(overallLabel(24, true)).toBe("Overall, a year on average");
    expect(overallLabel(3, false)).toBe("Overall, over 3 months");
  });
});

describe("RecordedReturn", () => {
  it("says how much history is needed below the minimum", () => {
    customRender(
      <RecordedReturn
        assumedAnnualReturn={5}
        balances={[
          { year: 2026, month: 1, value: 1000 },
          { year: 2026, month: 2, value: 1010 },
        ]}
        id="recorded-return"
        monthlyContribution={100}
      />,
    );
    const region = screen.getByRole("region", { name: HEADING });
    expect(
      within(region).getByText(
        "Not enough history yet: this needs at least 3 months of balances in a row.",
      ),
    ).toBeDefined();
    expect(within(region).queryByText(/^Overall/)).toBeNull();
    // The user's own assumption still shows, as a plain fact outside the recorded block.
    expect(within(region).queryByText(/you set for this account/)).toBeNull();
    expect(
      screen.getByText("The estimated annual return you set for this account is 5%."),
    ).toBeDefined();
  });

  it("shows one figure per year and an overall figure, with the payment assumed", () => {
    // Nov 2024 1,000 -> Dec 1,110 with 100 paid in: (1110 - 1000 - 100) / 1050 = 0.952% -> 1.0%.
    // Dec 1,110 -> Jan 2025 1,060 with 100 paid in: (1060 - 1110 - 100) / 1160 = -12.93% -> -12.9%.
    // Jan 1,060 -> Feb 1,160: (1160 - 1060 - 100) / 1110 = 0 -> 0.0%.
    // 2025: (1 - 0.129310...) * 1 - 1 = -12.9%. Overall: 1.0095238 * 0.8706897 - 1 = -0.1210
    // -> -12.1%, over 3 months.
    customRender(
      <RecordedReturn
        assumedAnnualReturn={null}
        balances={[
          { year: 2024, month: 11, value: 1000 },
          { year: 2024, month: 12, value: 1110 },
          { year: 2025, month: 1, value: 1060 },
          { year: 2025, month: 2, value: 1160 },
        ]}
        id="recorded-return"
        monthlyContribution={100}
      />,
    );
    const region = screen.getByRole("region", { name: HEADING });
    const terms = within(region)
      .getAllByRole("term")
      .map((t) => t.textContent);
    const figures = within(region)
      .getAllByRole("definition")
      .map((d) => d.textContent);
    expect(terms).toEqual(["2024 (1 month)", "2025 (2 months)", "Overall, over 3 months"]);
    expect(figures).toEqual(["1.0%", "-12.9%", "-12.1%"]);
    expect(
      within(region).getByText("Assumes £100 paid in each month, your monthly contribution."),
    ).toBeDefined();
    expect(within(region).getByText("Investment returns can go down as well as up.")).toBeDefined();
    expect(screen.queryByText(/you set for this account/)).toBeNull();
  });

  it("says when nothing is assumed paid in", () => {
    customRender(
      <RecordedReturn
        balances={[
          { year: 2026, month: 1, value: 1000 },
          { year: 2026, month: 2, value: 1010 },
          { year: 2026, month: 3, value: 1020.1 },
        ]}
        id="recorded-return"
      />,
    );
    expect(
      screen.getByText("Assumes nothing paid in, as no monthly contribution is set."),
    ).toBeDefined();
  });

  it("keeps the assumption out of the recorded figures' list", () => {
    // 1,000 -> 1,010 -> 1,020.10, nothing paid in: +1% twice.
    customRender(
      <RecordedReturn
        assumedAnnualReturn={5}
        balances={[
          { year: 2026, month: 1, value: 1000 },
          { year: 2026, month: 2, value: 1010 },
          { year: 2026, month: 3, value: 1020.1 },
        ]}
        id="recorded-return"
      />,
    );
    const region = screen.getByRole("region", { name: HEADING });
    const terms = within(region)
      .getAllByRole("term")
      .map((t) => t.textContent);
    expect(terms).toEqual(["2026 (2 months)", "Overall, over 2 months"]);
    const line = screen.getByText("The estimated annual return you set for this account is 5%.");
    expect(region.contains(line)).toBe(false);
  });

  it("says when the balances do not show the monthly contribution", () => {
    // 1,000 flat with 500 a month set: (1000 - 1000 - 500) / (1000 + 250) = -40% a month, which
    // describes the records, not the investments. No figure, the reason instead.
    customRender(
      <RecordedReturn
        balances={[
          { year: 2026, month: 1, value: 1000 },
          { year: 2026, month: 2, value: 1000 },
          { year: 2026, month: 3, value: 1000 },
        ]}
        id="recorded-return"
        monthlyContribution={500}
      />,
    );
    const region = screen.getByRole("region", { name: HEADING });
    expect(
      within(region).getByText(
        "Not enough reliable history. The balances recorded do not show the £500 paid in each month. Check the monthly contribution on this account.",
      ),
    ).toBeDefined();
    expect(within(region).queryByRole("definition")).toBeNull();
    expect(within(region).queryByText(/-40/)).toBeNull();
  });

  it("names the month that moves by more than 25%", () => {
    // 1,000 -> 1,010 -> 1,313, nothing paid in: February to March is 303 / 1010 = +30%.
    customRender(
      <RecordedReturn
        balances={[
          { year: 2026, month: 1, value: 1000 },
          { year: 2026, month: 2, value: 1010 },
          { year: 2026, month: 3, value: 1313 },
        ]}
        id="recorded-return"
      />,
    );
    expect(
      screen.getByText(
        "Not enough reliable history. The balance changes by more than 25% in one month between February 2026 and March 2026. Check the balances recorded for those months.",
      ),
    ).toBeDefined();
  });
});
