import { light } from "@flump/tokens/native";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { processColor, StyleSheet, type TextStyle } from "react-native";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { ChartFigure } from "./ChartFigure";
import { chartFigureStates } from "./ChartFigure.states";

/** Draws the chart 212 points wide: 200 of plot inside the 6 point inset on each side. */
async function draw(props: Parameters<typeof ChartFigure>[0]) {
  await render(
    <ThemeProvider scheme="light">
      <ChartFigure {...props} testID="c" />
    </ThemeProvider>,
  );
  await act(async () => {
    fireEvent(screen.getByTestId("c", { includeHiddenElements: true }), "layout", {
      nativeEvent: { layout: { width: 212, height: 120 } },
    });
  });
}

const segment = (i: number) =>
  screen.getByTestId(`c-segment-${i}`, { includeHiddenElements: true }).props;

describe("ChartFigure", () => {
  it("is one image to a screen reader, named by its title and summary as web's figure", async () => {
    await draw(chartFigureStates.falling);
    const root = screen.getByTestId("c");
    expect(root.props.accessible).toBe(true);
    expect(root.props.accessibilityRole).toBe("image");
    expect(root.props.accessibilityLabel).toBe(
      "Residential mortgage balance history. Down £3,300 since May 2026. The dashed end is this month's saved balance, not yet recorded.",
    );
    // The drawing and its end label inside are not read on their own.
    const drawing = screen.getByTestId("c-drawing", { includeHiddenElements: true });
    expect(drawing.props.accessibilityElementsHidden).toBe(true);
    expect(drawing.props.importantForAccessibility).toBe("no-hide-descendants");
  });

  it("labels the end point with its figure, as web's end label, in tabular figures", async () => {
    await draw(chartFigureStates.falling);
    const label = screen.getByTestId("c-end-label", { includeHiddenElements: true });
    expect(label).toHaveTextContent("£186,000");
    const style = StyleSheet.flatten(label.props.style) as TextStyle;
    expect(style.fontVariant).toEqual(["tabular-nums"]);
  });

  it("places points evenly across and at the engine's heights, in the text colour", async () => {
    await draw({
      title: "t",
      summary: "s",
      points: [
        { fraction: 0, carried: false },
        { fraction: 1, carried: false },
        { fraction: 0.5, carried: false },
      ],
    });
    // Plot 200 wide and 108 high (120 less two 6 point insets). Point 0: x 6, y 6 + 108 = 114.
    // Point 1: x 6 + 100 = 106, y 6. Point 2: x 206, y 6 + 54 = 60.
    expect([segment(0).x1, segment(0).y1, segment(0).x2, segment(0).y2]).toEqual([6, 114, 106, 6]);
    expect([segment(1).x2, segment(1).y2]).toEqual([206, 60]);
    // The native drawing holds the colour as a number.
    expect(segment(0).stroke.payload).toBe(processColor(light.colors["text.primary"]));
  });

  it("dashes a segment to or from a carried month, and only those", async () => {
    await draw(chartFigureStates.withGap);
    expect([segment(0), segment(1), segment(2)].map((s) => s.strokeDasharray)).toEqual([
      undefined,
      ["4", "4"],
      ["4", "4"],
    ]);
  });

  it("draws no line below two points", async () => {
    await draw({ title: "t", summary: "s", points: [{ fraction: 0.5, carried: false }] });
    expect(screen.queryByTestId("c-segment-0", { includeHiddenElements: true })).toBeNull();
  });
});
