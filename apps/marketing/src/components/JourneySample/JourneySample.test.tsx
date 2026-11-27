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
