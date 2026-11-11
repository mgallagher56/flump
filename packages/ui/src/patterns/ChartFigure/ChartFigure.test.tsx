import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { visuallyHiddenRecipe } from "../../primitives/VisuallyHidden/VisuallyHidden.styles";
import { ChartFigure } from "./ChartFigure";

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

  it("summary is a figcaption, visually hidden by default", () => {
    renderFigure();
    const caption = screen.getByText(SUMMARY);
    expect(caption.tagName).toBe("FIGCAPTION");
    expect(caption.parentElement?.tagName).toBe("FIGURE");
    expect(caption.className).toBe(visuallyHiddenRecipe({ focusable: false }));
    expect(screen.getByRole("figure").getAttribute("aria-describedby")).toBe(caption.id);
  });

  it("showSummary renders a visible figcaption", () => {
    renderFigure({ showSummary: true });
    const caption = screen.getByText(SUMMARY);
    expect(caption.tagName).toBe("FIGCAPTION");
    expect(caption.parentElement?.tagName).toBe("FIGURE");
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
    expect(toggle.textContent).not.toMatch(/schedule/i);
    fireEvent.click(toggle);
    expect(screen.getByRole("table")).toBeDefined();
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(toggle);
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("omits the drawer without a dataTable", () => {
    renderFigure();
    expect(screen.queryByRole("button", { name: "Show data" })).toBeNull();
  });
});
