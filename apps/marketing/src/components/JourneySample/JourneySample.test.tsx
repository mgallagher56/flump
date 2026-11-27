import { render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { JourneyStopKey } from "../JourneyStop/journeyStops";
import { JourneySample } from "./JourneySample";
import {
  formatGbp,
  formatGbpHundreds,
  SAMPLE_DEBT,
  SAMPLE_HOME,
  SAMPLE_SAVINGS,
} from "./journeySamples";

const STOPS: JourneyStopKey[] = [
  "accounts",
  "budget",
  "pay",
  "savings-and-pension",
  "debt-and-borrowing",
  "picture",
];

afterEach(() => vi.unstubAllGlobals());

describe("JourneySample", () => {
  it.each(STOPS)("tags the %s sample as an example in real text", (stop) => {
    const { container } = render(<JourneySample stop={stop} />);
    expect(screen.getAllByText("Example").length).toBeGreaterThanOrEqual(1);
    expect(container.querySelector("[data-sample]")).not.toBeNull();
  });

  it("draws the debt line in the debt colour (apricot), never violet or rose", () => {
    const { container } = render(<JourneySample stop="debt-and-borrowing" />);
    const classes = Array.from(container.querySelectorAll("path, circle"))
      .map((el) => el.getAttribute("class") ?? "")
      .join(" ");
    expect(classes).toContain("chart.debt");
    expect(classes).not.toMatch(/series[45]|accentPurple|violet|rose/);
    expect(screen.getByText(SAMPLE_DEBT.endLabel)).toBeTruthy();
  });

  it("draws the savings line in the wealth colour", () => {
    const { container } = render(<JourneySample stop="savings-and-pension" />);
    expect(
      container.querySelector("path:not([class*='fill-opacity'])")?.getAttribute("class"),
    ).toMatch(/chart\.wealth/);
  });

  it("gives every counting figure its final value in the server HTML and its accessible text", () => {
    const html = renderToString(<JourneySample stop="accounts" />);
    expect(html.split(formatGbpHundreds(SAMPLE_HOME.netWorth))).toHaveLength(3);
    render(<JourneySample stop="savings-and-pension" />);
    expect(screen.getByTestId("journey-figure-savings").firstElementChild?.textContent).toBe(
      formatGbp(SAMPLE_SAVINGS.end),
    );
  });

  it("lists six accounts, each marked as had or owed in words", () => {
    render(<JourneySample stop="accounts" />);
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(6);
    expect(items.map((li) => li.lastElementChild?.textContent)).toEqual([
      "You have",
      "You have",
      "You have",
      "You owe",
      "You owe",
      "You owe",
    ]);
  });
});
