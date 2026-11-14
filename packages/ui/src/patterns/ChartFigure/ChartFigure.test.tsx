import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { visuallyHiddenRecipe } from "../../primitives/VisuallyHidden/VisuallyHidden.styles";
import {
  ChartFigure,
  type ChartFigureConfig,
  NOT_ENOUGH_DATA_TEXT,
  pickTicks,
  useChartFigure,
} from "./ChartFigure";

let seenConfig: ChartFigureConfig | undefined;
/** Records what a chart drawn inside a ChartFigure reads from its context. */
const Probe = () => {
  seenConfig = useChartFigure();
  return null;
};

const SUMMARY = "Balance grows from £1,000 to £12,345 over 10 years.";

const renderFigure = (props: Partial<React.ComponentProps<typeof ChartFigure>> = {}) =>
  render(
    <ChartFigure summary={SUMMARY} title="Savings forecast" {...props}>
      <svg data-testid="chart">
        <title>chart</title>
      </svg>
    </ChartFigure>,
  );

describe("ChartFigure Pattern", () => {
  it("figure is named and described", () => {
    renderFigure();
    expect(screen.getByRole("figure", { name: "Savings forecast" })).toBeDefined();
    expect(screen.getByText(SUMMARY)).toBeDefined();
  });

  it("summary sits in the figcaption, the figure's first child, hidden with showSummary false", () => {
    renderFigure({ showSummary: false });
    const summary = screen.getByText(SUMMARY);
    const caption = summary.parentElement as HTMLElement;
    expect(caption.tagName).toBe("FIGCAPTION");
    expect(caption.parentElement?.firstElementChild).toBe(caption);
    expect(summary.className).toBe(visuallyHiddenRecipe({ focusable: false }));
    expect(screen.getByRole("figure").getAttribute("aria-describedby")).toBe(summary.id);
  });

  it("shows the summary visibly by default, directly under the title (P10.1)", () => {
    renderFigure();
    const summary = screen.getByText(SUMMARY);
    expect(summary.className).not.toBe(visuallyHiddenRecipe({ focusable: false }));
    expect(summary.previousElementSibling).toBe(screen.getByRole("heading"));
  });

  it("chart svg is hidden from AT", () => {
    renderFigure();
    const wrapper = screen.getByTestId("chart").closest("[aria-hidden='true']");
    expect(wrapper).not.toBeNull();
  });

  it("hideTitle hides the heading visually but still names the figure", () => {
    renderFigure({ hideTitle: true });
    const heading = screen.getByRole("heading", { name: "Savings forecast" });
    expect(heading.className).toBe(visuallyHiddenRecipe({ focusable: false }));
    expect(screen.getByRole("figure", { name: "Savings forecast" })).toBeDefined();
  });

  it("title is visible by default", () => {
    renderFigure();
    expect(screen.getByRole("heading").className).not.toBe(
      visuallyHiddenRecipe({ focusable: false }),
    );
  });

  it("removes focusable chart content from the tab order, including late additions", async () => {
    render(
      <ChartFigure summary={SUMMARY} title="Savings forecast">
        <svg data-testid="chart" ref={(el) => el?.setAttribute("tabindex", "0")}>
          <title>chart</title>
        </svg>
      </ChartFigure>,
    );
    const svg = screen.getByTestId("chart");
    expect(svg.getAttribute("tabindex")).toBe("-1");
    svg.setAttribute("tabindex", "0");
    await waitFor(() => expect(svg.getAttribute("tabindex")).toBe("-1"));
  });

  it("data table is reachable", () => {
    renderFigure({
      dataTable: (
        <table>
          <caption>Yearly balance</caption>
          <tbody>
            <tr>
              <td>£12,345</td>
            </tr>
          </tbody>
        </table>
      ),
    });
    expect(screen.queryByRole("table")).toBeNull();
    const toggle = screen.getByRole("button", { name: "Show data" });
    expect(toggle.textContent).toBe("Show data");
    fireEvent.click(toggle);
    expect(screen.getByRole("table")).toBeDefined();
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(toggle.textContent).toBe("Hide data");
    fireEvent.click(toggle);
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("draws no chart, and shows the summary with a prompt, below minPoints", () => {
    renderFigure({ pointCount: 2, legend: <ul aria-label="Chart key" /> });
    expect(screen.queryByTestId("chart")).toBeNull();
    expect(screen.queryByRole("list", { name: "Chart key" })).toBeNull();
    expect(screen.getByText(SUMMARY).className).not.toBe(
      visuallyHiddenRecipe({ focusable: false }),
    );
    expect(screen.getByText(NOT_ENOUGH_DATA_TEXT)).toBeDefined();
  });

  it("draws the chart at minPoints, or when no pointCount is given", () => {
    const { unmount } = renderFigure({ pointCount: 3 });
    expect(screen.getByTestId("chart")).toBeDefined();
    expect(screen.queryByText(NOT_ENOUGH_DATA_TEXT)).toBeNull();
    unmount();
    renderFigure({ pointCount: 4, minPoints: 5, notEnoughDataText: "Add another year." });
    expect(screen.getByText("Add another year.")).toBeDefined();
  });

  it("hands directLabels, annotation and maxTicks to the chart through context", () => {
    seenConfig = undefined;
    render(
      <ChartFigure
        annotation={{ x: 2030, label: "Paid off, Mar 2030" }}
        directLabels
        maxTicks={4}
        summary={SUMMARY}
        title="Debt"
      >
        <Probe />
      </ChartFigure>,
    );
    expect(seenConfig).toEqual({
      directLabels: true,
      annotation: { x: 2030, label: "Paid off, Mar 2030" },
      maxTicks: 4,
    });
  });

  it("useChartFigure outside a figure returns the defaults", () => {
    seenConfig = undefined;
    render(<Probe />);
    expect(seenConfig).toEqual({ directLabels: false, maxTicks: 6 });
  });

  it("pickTicks keeps the ends and at most maxTicks values", () => {
    const years = Array.from({ length: 26 }, (_, i) => 2025 + i);
    const ticks = pickTicks(years);
    expect(ticks).toHaveLength(6);
    expect(ticks[0]).toBe(2025);
    expect(ticks.at(-1)).toBe(2050);
    expect(pickTicks([1, 2, 3], 6)).toEqual([1, 2, 3]);
    expect(pickTicks(years, 3)).toEqual([2025, 2038, 2050]);
    expect(pickTicks(years, Number.NaN)).toHaveLength(6);
  });

  it("renders a notice slot above the chart and a legend slot below it", () => {
    render(
      <ChartFigure
        legend={
          <ul aria-label="Chart key">
            <li>Net worth</li>
          </ul>
        }
        notice={<p>Sample data</p>}
        summary={SUMMARY}
        title="Savings forecast"
      >
        <svg data-testid="chart">
          <title>chart</title>
        </svg>
      </ChartFigure>,
    );
    const notice = screen.getByText("Sample data");
    const chart = screen.getByTestId("chart");
    const legend = screen.getByRole("list", { name: "Chart key" });
    expect(notice.compareDocumentPosition(chart) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(chart.compareDocumentPosition(legend) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // The legend sits outside the aria-hidden chart wrapper, so assistive tech can read it.
    expect(legend.closest("[aria-hidden='true']")).toBeNull();
  });

  it("headingLevel sets the title element, h3 by default", () => {
    const { unmount } = renderFigure();
    expect(screen.getByRole("heading", { level: 3 })).toBeDefined();
    unmount();
    renderFigure({ headingLevel: "h2" });
    expect(screen.getByRole("heading", { level: 2, name: "Savings forecast" })).toBeDefined();
  });

  it("draws no notice unless one is passed", () => {
    const { container } = renderFigure();
    expect(container.querySelector("[data-notice]")).toBeNull();
    expect(screen.queryByRole("note")).toBeNull();
  });

  it("omits the drawer without a dataTable", () => {
    renderFigure();
    expect(screen.queryByRole("button", { name: "Show data" })).toBeNull();
  });

  it("removes focusable children from the tab order without a mutation loop", async () => {
    const original = Element.prototype.setAttribute;
    let tabindexWrites = 0;
    const spy = vi.spyOn(Element.prototype, "setAttribute").mockImplementation(function (
      this: Element,
      name: string,
      value: string,
    ) {
      if (name !== "tabindex") return original.call(this, name, value);
      tabindexWrites += 1;
      // Past the budget, stop writing so a regression ends instead of looping forever.
      if (tabindexWrites > 20) return;
      return original.call(this, name, value);
    });
    try {
      render(
        <ChartFigure summary={SUMMARY} title="Savings forecast">
          <button type="button">point</button>
          <input aria-label="x" />
          <a href="/x">savings detail</a>
          <button tabIndex={-1} type="button">
            already out
          </button>
        </ChartFigure>,
      );
      await new Promise((resolve) => setTimeout(resolve, 20));
      // One write each for the button, input and link, plus React's own write for the element
      // rendered with tabIndex={-1}; none from the sweep for that one, and none from the observer
      // re-firing on its own writes.
      expect(tabindexWrites).toBe(4);
    } finally {
      spy.mockRestore();
    }
    for (const el of document.querySelectorAll("button, input, a")) {
      expect(el.getAttribute("tabindex")).toBe("-1");
    }
  });
});
