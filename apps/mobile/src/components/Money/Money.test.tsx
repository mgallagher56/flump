import { dark, light, textStyles } from "@flump/tokens/native";
import { render, screen } from "@testing-library/react-native";
import { StyleSheet, type TextStyle } from "react-native";
import { expectHoldsAtDoubleText } from "../../testing/textScale";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { Money } from "./Money";
import { moneyStates } from "./Money.states";

const styleOf = (testID: string) =>
  StyleSheet.flatten(screen.getByTestId(testID).props.style) as TextStyle;

describe("Money", () => {
  it("shows whole pounds, rounding pence to the nearest pound", async () => {
    await render(
      <ThemeProvider scheme="light">
        <Money value={1204.5} testID="m" />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("m")).toHaveTextContent("£1,205");
  });

  it("shows Not set for null, never £0", async () => {
    await render(
      <ThemeProvider scheme="light">
        <Money value={null} testID="m" />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("m")).toHaveTextContent("Not set");
    expect(screen.queryByText("£0")).toBeNull();
  });

  it("shows £0 for a real zero", async () => {
    await render(
      <ThemeProvider scheme="light">
        <Money value={0} testID="m" />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("m")).toHaveTextContent("£0");
  });

  it.each([
    ["light", light],
    ["dark", dark],
  ] as const)("a debt is in the primary text colour, not red, in %s", async (scheme, tokens) => {
    await render(
      <ThemeProvider scheme={scheme}>
        <Money value={-23500} testID="m" />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("m")).toHaveTextContent("-£23,500");
    expect(styleOf("m").color).toBe(tokens.colors["text.primary"]);
    expect(styleOf("m").color).not.toBe(tokens.colors["status.danger.text"]);
  });

  it("always uses tabular numerals", async () => {
    await render(
      <ThemeProvider scheme="light">
        <Money value={87} size="sm" color="secondary" testID="m" />
      </ThemeProvider>,
    );
    expect(styleOf("m").fontVariant).toEqual(["tabular-nums"]);
    expect(styleOf("m").color).toBe(light.colors["text.secondary"]);
  });

  it.each([
    ["sm", "body.sm"],
    ["md", "body.md"],
    ["lg", "heading.lg"],
  ] as const)("size %s uses the %s text style", async (size, key) => {
    await render(
      <ThemeProvider scheme="light">
        <Money value={10} size={size} testID="m" />
      </ThemeProvider>,
    );
    expect(styleOf("m").fontSize).toBe(textStyles[key].fontSize);
  });

  it.each(Object.entries(moneyStates))("%s holds at 200%% text", async (_name, props) => {
    await expectHoldsAtDoubleText(<Money {...props} />);
  });
});
