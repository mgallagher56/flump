import { dark, light, radii } from "@flump/tokens/native";
import { render, screen } from "@testing-library/react-native";
import { StyleSheet, type TextStyle, type ViewStyle } from "react-native";
import { expectHoldsAtDoubleText } from "../../testing/textScale";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { StatusBadge } from "./StatusBadge";
import { statusBadgeStates } from "./StatusBadge.states";

const boxOf = () => StyleSheet.flatten(screen.getByTestId("b").props.style) as ViewStyle;
const textOf = (label: string) =>
  StyleSheet.flatten(screen.getByText(label).props.style) as TextStyle;

describe("StatusBadge", () => {
  it.each([
    ["light", light],
    ["dark", dark],
  ] as const)("neutral uses the neutral status tokens in %s", async (scheme, tokens) => {
    await render(
      <ThemeProvider scheme={scheme}>
        <StatusBadge label="Left out of net worth" testID="b" />
      </ThemeProvider>,
    );
    expect(boxOf().backgroundColor).toBe(tokens.colors["status.neutral.bg"]);
    expect(boxOf().borderColor).toBe(tokens.colors["status.neutral.border"]);
    expect(textOf("Left out of net worth").color).toBe(tokens.colors["status.neutral.text"]);
  });

  it.each([
    ["light", light],
    ["dark", dark],
  ] as const)("info uses the info status tokens in %s", async (scheme, tokens) => {
    await render(
      <ThemeProvider scheme={scheme}>
        <StatusBadge label="Calculated" tone="info" testID="b" />
      </ThemeProvider>,
    );
    expect(boxOf().backgroundColor).toBe(tokens.colors["status.info.bg"]);
    expect(boxOf().borderColor).toBe(tokens.colors["status.info.border"]);
    expect(textOf("Calculated").color).toBe(tokens.colors["status.info.text"]);
  });

  it("is a pill and not a control", async () => {
    await render(
      <ThemeProvider scheme="light">
        <StatusBadge label="Calculated" testID="b" />
      </ThemeProvider>,
    );
    expect(boxOf().borderRadius).toBe(radii.full);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it.each(Object.entries(statusBadgeStates))("%s holds at 200%% text", async (_name, props) => {
    await expectHoldsAtDoubleText(<StatusBadge {...props} />);
  });
});
