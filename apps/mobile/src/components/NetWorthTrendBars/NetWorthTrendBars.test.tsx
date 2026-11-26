import { dark, light } from "@flump/tokens/native";
import { render, screen } from "@testing-library/react-native";
import { StyleSheet, type ViewStyle } from "react-native";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { NetWorthTrendBars } from "./NetWorthTrendBars";
import { netWorthTrendBarsStates } from "./NetWorthTrendBars.states";

const hidden = { includeHiddenElements: true } as const;
const styleOf = (testID: string) =>
  StyleSheet.flatten(screen.getByTestId(testID, hidden).props.style) as ViewStyle;

async function draw(
  name: keyof typeof netWorthTrendBarsStates,
  scheme: "light" | "dark" = "light",
) {
  await render(
    <ThemeProvider scheme={scheme}>
      <NetWorthTrendBars {...netWorthTrendBarsStates[name]} />
    </ThemeProvider>,
  );
}

describe("NetWorthTrendBars", () => {
  it("places each bar at the engine's percentages, the latest solid and the rest outlined", async () => {
    await draw("sevenMonths");
    const first = styleOf("net-worth-trend-bar-2026-04");
    expect([first.top, first.height]).toEqual(["5.95%", "94.05%"]);
    expect(first.backgroundColor).toBe("transparent");
    expect(first.borderColor).toBe(light.colors["text.primary"]);
    const latest = styleOf("net-worth-trend-bar-2026-10");
    expect([latest.top, latest.height]).toEqual(["0%", "100%"]);
    expect(latest.backgroundColor).toBe(light.colors["text.primary"]);
    expect(styleOf("net-worth-trend-zero").top).toBe("100%");
  });

  it("bars below zero hang from the zero line, in the same colour as the rest", async () => {
    await draw("belowZero", "dark");
    expect(styleOf("net-worth-trend-zero").top).toBe("40%");
    const owed = styleOf("net-worth-trend-bar-2026-08");
    expect([owed.top, owed.height]).toEqual(["40%", "60%"]);
    expect(owed.borderColor).toBe(dark.colors["text.primary"]);
  });

  it("a break in the check-ins is one empty slot", async () => {
    await draw("withBreak");
    const plot = screen.getByTestId("net-worth-trend-plot", hidden);
    // June, the gap for July, August, September, then the zero line.
    expect(plot.children).toHaveLength(5);
  });

  it("is hidden from screen readers, which hear the months and figures as a list", async () => {
    await draw("withBreak");
    expect(
      screen.getByTestId("net-worth-trend-plot", hidden).props.accessibilityElementsHidden,
    ).toBe(true);
    expect(screen.getByTestId("net-worth-trend").props.accessibilityLabel).toBe(
      "Net worth at your last 3 monthly check-ins, oldest first. June 2026: £3,000. No check-in for July 2026. August 2026: £3,500. September 2026, the latest: £4,000.",
    );
  });

  it("speaks a negative month with minus", async () => {
    await draw("belowZero");
    expect(screen.getByTestId("net-worth-trend").props.accessibilityLabel).toContain(
      "August 2026: minus £3,000",
    );
  });
});
