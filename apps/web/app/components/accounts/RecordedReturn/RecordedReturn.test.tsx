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
    // The user's own assumption still shows, as a plain fact.
    expect(within(region).getByText("Your estimated annual return")).toBeDefined();
    expect(within(region).getByText("5%")).toBeDefined();
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
    expect(within(region).queryByText("Your estimated annual return")).toBeNull();
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
});
