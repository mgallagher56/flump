import { light } from "@flump/tokens/native";
import { render, screen } from "@testing-library/react-native";
import { StyleSheet, type TextStyle } from "react-native";
import { expectHoldsAtDoubleText } from "../../testing/textScale";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { DataList } from "./DataList";
import { dataListStates } from "./DataList.states";

describe("DataList", () => {
  it("reads each line as one item, with its note, in the order given", async () => {
    await render(
      <ThemeProvider scheme="light">
        <DataList {...dataListStates.months} testID="l" />
      </ThemeProvider>,
    );
    expect(screen.getByText("Balance by month")).toBeOnTheScreen();
    expect(screen.getByTestId("l-row-2026-10").props.accessibilityLabel).toBe(
      "October 2026, £186,550, Calculated",
    );
    expect(screen.getByTestId("l-row-2026-09").props.accessibilityLabel).toBe(
      "September 2026, £187,100",
    );
  });

  it("speaks a change in words; figures are tabular in the ordinary colour", async () => {
    await render(
      <ThemeProvider scheme="light">
        <DataList {...dataListStates.changes} testID="l" />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("l-row-c").props.accessibilityLabel).toBe(
      "Workplace pension, down £260",
    );
    const style = StyleSheet.flatten(screen.getByText("−£260").props.style) as TextStyle;
    expect(style.fontVariant).toEqual(["tabular-nums"]);
    expect(style.color).toBe(light.colors["text.primary"]);
  });

  it.each(Object.entries(dataListStates))("%s holds at 200%% text", async (_name, props) => {
    await expectHoldsAtDoubleText(<DataList {...props} />);
  });
});
