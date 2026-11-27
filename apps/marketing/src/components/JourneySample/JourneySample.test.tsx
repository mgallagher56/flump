import { SAMPLE_HOUSEHOLDS } from "@flump/finance-engine";
import { render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { JourneyStopKey } from "../JourneyStop/journeyStops";
import { JourneySample } from "./JourneySample";
import {
  formatGbp,
  formatGbpHundreds,
  formatMonths,
  SAMPLE_BUDGET,
  SAMPLE_DEBT,
  SAMPLE_HOME,
  SAMPLE_SAVINGS,
  sampleFiguresFor,
} from "./journeySamples";

const STOPS: [JourneyStopKey, string][] = [
  ["accounts", "accounts"],
  ["budget", "budget"],
  ["pay", "pay"],
  ["savings-and-pension", "savings"],
  ["debt-and-borrowing", "debt"],
  ["picture", "picture"],
];

describe("JourneySample", () => {
  it.each(STOPS)(
    "tags the %s sample as an example in real text, named for its moment",
    (stop, name) => {
      const { container } = render(<JourneySample stop={stop} />);
      expect(screen.getAllByText("Example").length).toBeGreaterThanOrEqual(1);
      expect(container.querySelector("[data-sample]")?.getAttribute("data-sample")).toBe(name);
    },
  );

  it("draws the debt line in violet as prototype 11, never rose", () => {
    const { container } = render(<JourneySample stop="debt-and-borrowing" />);
    const chart = container.querySelector("[data-drawn-chart]");
    expect(chart?.getAttribute("class")).toContain("chart.series4");
    expect(container.innerHTML).not.toMatch(/series5|violetRose\.shade|tint\.rose/);
    expect(screen.getByText(SAMPLE_DEBT.endLabel)).toBeTruthy();
  });

  it("draws the savings line in sky as prototype 11, its readout on the last month", () => {
    const { container } = render(<JourneySample stop="savings-and-pension" />);
    expect(container.querySelector("[data-drawn-chart]")?.getAttribute("class")).toContain(
      "chart.series6",
    );
    const last = SAMPLE_SAVINGS.points.at(-1);
    expect(container.querySelector("[data-readout-text]")?.textContent).toBe(
      `${formatGbp(last?.value ?? 0)}, ${last?.when}`,
    );
  });

  it("gives every counting figure its final value in the server HTML and its accessible text", () => {
    const html = renderToString(<JourneySample stop="accounts" />);
    // Once for assistive technology, once in the visible digits.
    expect(html.split(formatGbpHundreds(SAMPLE_HOME.netWorth))).toHaveLength(3);
    render(<JourneySample stop="savings-and-pension" />);
    const figure = screen.getByTestId("journey-figure-savings");
    expect(figure.firstElementChild?.textContent).toBe(formatGbp(SAMPLE_SAVINGS.end));
    expect(figure.lastElementChild?.getAttribute("aria-hidden")).toBe("true");
    expect(figure.lastElementChild?.getAttribute("data-count-from")).toBe(
      String(SAMPLE_SAVINGS.points[0]?.value),
    );
  });

  it("lays the budget's outgoings along the bar in order, with what is left over and the breathing room", () => {
    const { container } = render(<JourneySample stop="budget" />);
    expect(container.querySelectorAll("[data-bar-segment]")).toHaveLength(
      SAMPLE_BUDGET.segments.length,
    );
    expect(
      Array.from(container.querySelectorAll("[data-budget-row]")).map(
        (li) => li.children[1]?.textContent,
      ),
    ).toEqual(SAMPLE_BUDGET.segments.map((seg) => seg.label));
    expect(screen.getByText(formatGbp(SAMPLE_BUDGET.leftOver))).toBeTruthy();
    if (SAMPLE_HOME.monthsOfCover !== null) {
      expect(screen.getAllByText(formatMonths(SAMPLE_HOME.monthsOfCover))).toHaveLength(2);
    }
  });

  it("shows the Home page's three figures, net worth as the lead tile", () => {
    const { container } = render(<JourneySample stop="picture" />);
    const tiles = Array.from(container.querySelectorAll("[data-tile]"));
    expect(tiles.map((tile) => tile.firstElementChild?.textContent)).toEqual([
      "Net worth",
      "Left over each month",
      "Breathing room",
    ]);
    expect(screen.getByTestId("journey-figure-picture-net-worth").textContent).toBe(
      formatGbpHundreds(SAMPLE_HOME.netWorth).repeat(2),
    );
  });
});

describe("sampleFiguresFor", () => {
  const renter = SAMPLE_HOUSEHOLDS.renter.fixture;
  const outgoing = renter.budget[1] as (typeof renter.budget)[number];

  it("reads a renter's figures, with £0 cards and no debt for the accounts they do not have", () => {
    const figures = sampleFiguresFor(renter);
    // Current £1,850 + ISA £4,200 = £6,050 (the default basis leaves the student loan out);
    // £2,382 in − £1,630 out = £752; £6,050 over essentials of £1,280 = 4.73, which the engine
    // gives to one decimal place: 4.7 months.
    expect(figures.home).toEqual({ netWorth: 6050, leftOverMonthly: 752, monthsOfCover: 4.7 });
    expect(figures.accountCards.map((card) => card.amount)).toEqual([4200, 0, 0, 0, 0, 0]);
    expect(figures.budget.comesIn).toBe(2382);
    expect(figures.budget.leftOver).toBe(752);
    // Rent first: 850 / 2,382 = 0.3568430; everything out: 1,630 / 2,382 = 0.6842989
    expect(figures.budget.segments[0]?.share).toBeCloseTo(0.356843, 6);
    expect(figures.budget.leftOverStart).toBeCloseTo(0.6842989, 6);
    expect(figures.payslip.salary).toBe(38000);
    expect(figures.payslip.rows[2]?.label).toBe("Pension (5%)");
    // No "Cash saving" line, so only interest at 4.1% AER and the £1,200 August withdrawal:
    // a month's rate r = 0.041 / 12. Worked back 11 months from £4,200, the withdrawal 8 months
    // back from the start of the year: 4,200 / (1 + r)^11 + 1,200 / (1 + r)^8
    // = 4,045.33 + 1,167.70 = £5,213.
    expect(figures.savings.saving).toBe(0);
    expect(figures.savings.points[0]?.value).toBe(5213);
    expect(figures.savings.points.at(-1)?.value).toBe(4200);
    expect(figures.savings.points.at(-1)?.when).toBe("Nov");
    // No card or loan: nothing to pay off, so the line starts and ends in November 2026.
    expect(figures.debt).toMatchObject({
      start: 0,
      monthly: 0,
      startLabel: "November 2026",
      endLabel: "November 2026",
      fixedEndLabel: null,
    });
    expect(figures.debt.points).toHaveLength(1);
  });

  it("names an unnamed card, adds the loan, and reads the mortgage's fixed date", () => {
    const figures = sampleFiguresFor({
      ...renter,
      profile: { ...renter.profile, annualSalary: null },
      accounts: [
        { type: "Credit Card", balance: 1000, interestRate: 24, monthlyContribution: 100 },
        { id: "car", name: "Car loan", type: "Loan", balance: "500", monthlyContribution: 50 },
        {
          id: "m",
          name: "Mortgage",
          type: "Mortgage",
          balance: 90000,
          fixedRateEndDate: "2029-03-31",
        },
      ],
      budget: [{ ...outgoing, id: "save", name: "Cash saving", amount: 100 }],
    });
    // £1,000 card + £500 loan = £1,500 owed, paying £100 + £50 = £150 a month
    expect(figures.debt.start).toBe(1500);
    expect(figures.debt.monthly).toBe(150);
    expect(figures.debt.points[0]?.value).toBe(1500);
    expect(figures.debt.points.at(-1)?.value).toBe(0);
    expect(figures.debt.endLabel).toBe(figures.debt.points.at(-1)?.when);
    expect(figures.debt.fixedEndLabel).toBe("March 2029");
    expect(figures.accountCards.map((card) => card.amount)).toEqual([0, 0, 0, 90000, 1000, 500]);
    // Nothing comes in: the one outgoing takes no share of the bar.
    expect(figures.budget.segments).toEqual([
      { id: "save", label: "Cash saving", amount: 100, start: 0, share: 0 },
    ]);
    expect(figures.budget.leftOver).toBe(-100);
    // No salary: no take-home breakdown, so every row is £0.
    expect(figures.payslip.salary).toBe(0);
    expect(figures.payslip.rows.map((row) => row.amount)).toEqual([0, 0, 0]);
    expect(figures.savings.saving).toBe(100);
    // £0 in − £100 out
    expect(figures.home.leftOverMonthly).toBe(-100);
  });

  it("leaves out the Home page figures the engine cannot know", () => {
    const { home } = sampleFiguresFor({ ...renter, accounts: [], budget: [] });
    expect(home).toEqual({ netWorth: 0, leftOverMonthly: null, monthsOfCover: null });
  });
});
