import { dark, light } from "@flump/tokens/native";
import { render, screen, userEvent } from "@testing-library/react-native";
import { StyleSheet, type ViewStyle } from "react-native";
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

  it("has no menu button where there is nothing to open (More itself)", async () => {
    await render(
      <ThemeProvider scheme="light">
        <AppHeader title="More" />
      </ThemeProvider>,
    );
    expect(screen.queryByRole("button")).toBeNull();
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
