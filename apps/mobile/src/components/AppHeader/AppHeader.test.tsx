import { dark, light, spacing } from "@flump/tokens/native";
import { render, screen, userEvent } from "@testing-library/react-native";
import { StyleSheet, type ViewStyle } from "react-native";
import { memoryThemePreferenceStore } from "../../device/themePreference";
import { expectHoldsAtDoubleText } from "../../testing/textScale";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { AppHeader } from "./AppHeader";
import { appHeaderStates } from "./AppHeader.states";

describe("AppHeader", () => {
  it("names the screen as a header and has a named 48 point menu button that opens More", async () => {
    jest.useRealTimers();
    const user = userEvent.setup();
    const onOpenMenu = jest.fn();
    await render(
      <ThemeProvider scheme="light">
        <AppHeader title="Budget" onOpenMenu={onOpenMenu} />
      </ThemeProvider>,
    );
    expect(screen.getByRole("header", { name: "Budget" })).toBeOnTheScreen();
    const menu = screen.getByRole("button", { name: "Open More" });
    expect(StyleSheet.flatten(menu.props.style)).toMatchObject({ minHeight: 48, minWidth: 48 });
    await user.press(menu);
    expect(onOpenMenu).toHaveBeenCalledTimes(1);
  });

  it("every header button keeps its glyph off the screen edge by the same padding", async () => {
    // Device check at 200% text: the icon grows to fill its 48 point button, so the theme button
    // sat against the right edge. Each button pads its glyph alike, and grows instead.
    await render(
      <ThemeProvider scheme="light">
        <AppHeader title="Pension" onBack={() => {}} onOpenMenu={() => {}} />
      </ThemeProvider>,
    );
    for (const name of ["Back", "Open More", /Colour theme/]) {
      const control = screen.getByRole("button", { name });
      expect(StyleSheet.flatten(control.props.style)).toMatchObject({
        padding: spacing["2"],
      });
    }
  });

  it("on a stacked page: a named 48 point Back button before the title", async () => {
    jest.useRealTimers();
    const onBack = jest.fn();
    await render(
      <ThemeProvider scheme="light">
        <AppHeader title="Pension" onBack={onBack} />
      </ThemeProvider>,
    );
    const back = screen.getByRole("button", { name: "Back" });
    expect(StyleSheet.flatten(back.props.style)).toMatchObject({ minHeight: 48, minWidth: 48 });
    expect(screen.getByRole("header", { name: "Pension" })).toBeOnTheScreen();
    await userEvent.setup().press(back);
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("with no title (an unknown link) has no empty heading for a screen reader to land on", async () => {
    await render(
      <ThemeProvider scheme="light">
        <AppHeader title="" onBack={jest.fn()} />
      </ThemeProvider>,
    );
    expect(screen.queryByRole("header")).toBeNull();
    expect(screen.getByRole("button", { name: "Back" })).toBeOnTheScreen();
  });

  it("has no menu button where there is nothing to open (More itself), only the theme button", async () => {
    await render(
      <ThemeProvider scheme="light">
        <AppHeader title="More" />
      </ThemeProvider>,
    );
    expect(screen.getAllByRole("button").map((b) => b.props.accessibilityLabel)).toEqual([
      "Colour theme: system. Change to light",
    ]);
  });

  it("the theme button cycles the one stored choice: System, Light, Dark, then System", async () => {
    jest.useRealTimers();
    const user = userEvent.setup();
    await render(
      <ThemeProvider store={memoryThemePreferenceStore("system")}>
        <AppHeader title="Home" onOpenMenu={jest.fn()} />
      </ThemeProvider>,
    );
    const labels: string[] = [];
    for (let i = 0; i < 4; i += 1) {
      const button = screen.getByTestId("header-theme");
      labels.push(button.props.accessibilityLabel);
      await user.press(button);
    }
    expect(labels).toEqual([
      "Colour theme: system. Change to light",
      "Colour theme: light. Change to dark",
      "Colour theme: dark. Change to system",
      "Colour theme: system. Change to light",
    ]);
    // Four presses left it on Light; one more chooses Dark, and the header draws in it.
    await user.press(screen.getByTestId("header-theme"));
    const bar = StyleSheet.flatten(
      (screen.toJSON() as unknown as { props: { style: ViewStyle } }).props.style,
    );
    expect(bar?.backgroundColor).toBe(dark.colors["surface.canvas"]);
  });

  it.each([
    ["light", light],
    ["dark", dark],
  ] as const)("%s: sits on the canvas with a border below", async (scheme, set) => {
    await render(
      <ThemeProvider scheme={scheme}>
        <AppHeader title="Home" />
      </ThemeProvider>,
    );
    const bar = StyleSheet.flatten(
      (screen.toJSON() as unknown as { props: { style: ViewStyle } }).props.style,
    );
    expect(bar).toMatchObject({
      backgroundColor: set.colors["surface.canvas"],
      borderBottomColor: set.colors.border,
    });
  });

  it.each(Object.entries(appHeaderStates))("%s holds at 200%% text", async (_name, props) => {
    await expectHoldsAtDoubleText(<AppHeader {...props} />);
  });
});
