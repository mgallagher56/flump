import { dark, light, textStyles } from "@flump/tokens/native";
import { render, screen } from "@testing-library/react-native";
import { StyleSheet, type TextStyle } from "react-native";
import { expectHoldsAtDoubleText } from "../../testing/textScale";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { Text, type TextProps } from "./Text";
import { textStates } from "./Text.states";

const styleOf = (testID: string) =>
  StyleSheet.flatten(screen.getByTestId(testID).props.style) as TextStyle;

describe("Text", () => {
  it("defaults to body.md in the primary text colour", async () => {
    await render(
      <ThemeProvider scheme="light">
        <Text testID="t">Hello</Text>
      </ThemeProvider>,
    );
    // body.md in the tokens: 16 px on a 24 px line.
    expect(styleOf("t")).toMatchObject({
      fontSize: textStyles["body.md"].fontSize,
      lineHeight: textStyles["body.md"].lineHeight,
      color: light.colors["text.primary"],
    });
  });

  it("maps each colour name to its token in the current scheme", async () => {
    await render(
      <ThemeProvider scheme="dark">
        <Text testID="muted" color="muted">
          a
        </Text>
        <Text testID="danger" color="danger">
          b
        </Text>
      </ThemeProvider>,
    );
    expect(styleOf("muted").color).toBe(dark.colors["text.muted"]);
    expect(styleOf("danger").color).toBe(dark.colors["status.danger.text"]);
  });

  it("tabular sets tabular numerals; without it there are none", async () => {
    await render(
      <ThemeProvider scheme="light">
        <Text testID="fig" tabular>
          £1,234
        </Text>
        <Text testID="plain">Words</Text>
      </ThemeProvider>,
    );
    expect(styleOf("fig").fontVariant).toEqual(["tabular-nums"]);
    expect(styleOf("plain").fontVariant).toBeUndefined();
  });

  it("truncate gives one line and lineClamp gives that many", async () => {
    await render(
      <ThemeProvider scheme="light">
        <Text testID="one" truncate>
          a
        </Text>
        <Text testID="three" lineClamp={3}>
          b
        </Text>
        <Text testID="free">c</Text>
      </ThemeProvider>,
    );
    expect(screen.getByTestId("one").props.numberOfLines).toBe(1);
    expect(screen.getByTestId("three").props.numberOfLines).toBe(3);
    expect(screen.getByTestId("free").props.numberOfLines).toBeUndefined();
  });

  it("never turns off the system text size", async () => {
    await render(
      <ThemeProvider scheme="light">
        <Text testID="t">Hello</Text>
      </ThemeProvider>,
    );
    expect(screen.getByTestId("t").props.allowFontScaling).not.toBe(false);
  });

  it("a header keeps its role for screen readers", async () => {
    await render(
      <ThemeProvider scheme="light">
        <Text accessibilityRole="header" textStyle="heading.lg">
          Title
        </Text>
      </ThemeProvider>,
    );
    expect(screen.getByRole("header", { name: "Title" })).toBeOnTheScreen();
  });

  it.each(Object.entries(textStates) as [string, TextProps][])(
    "%s holds at 200%% text",
    async (_name, props) => {
      await expectHoldsAtDoubleText(<Text {...props} />, {
        truncates: Boolean(props.truncate || props.lineClamp),
      });
    },
  );
});
