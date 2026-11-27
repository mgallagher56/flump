import { dark } from "@flump/tokens/native";
import { act, render, screen } from "@testing-library/react-native";
import { Keyboard, StyleSheet, TextInput, type ViewStyle } from "react-native";
import { refreshControl } from "../../testing/refresh";
import { expectHoldsAtDoubleText } from "../../testing/textScale";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { Text } from "../Text";
import { Screen } from "./Screen";
import { screenStates } from "./Screen.states";

interface Tree {
  type: string;
  props: Record<string, unknown>;
  children: Tree[];
}

const flat = (style: unknown) => StyleSheet.flatten(style as ViewStyle) as ViewStyle;

describe("Screen", () => {
  it("fills the canvas colour of the theme", async () => {
    await render(
      <ThemeProvider scheme="dark">
        <Screen testID="s">
          <Text>Body</Text>
        </Screen>
      </ThemeProvider>,
    );
    expect(flat(screen.getByTestId("s").props.style).backgroundColor).toBe(
      dark.colors["surface.canvas"],
    );
  });

  it("scrolls by default with the phone gutter, and can stop scrolling", async () => {
    await render(
      <ThemeProvider scheme="light">
        <Screen testID="s">
          <Text>Scrolls</Text>
        </Screen>
      </ThemeProvider>,
    );
    const [scroller] = (screen.toJSON() as unknown as Tree).children;
    expect(scroller?.type).toBe("RCTScrollView");
    // page.gutter.sm (16), page.top.sm (20) and density.gap (16) in the tokens.
    expect(flat(scroller?.props.contentContainerStyle)).toMatchObject({
      paddingHorizontal: 16,
      paddingVertical: 20,
      gap: 16,
    });

    await render(
      <ThemeProvider scheme="light">
        <Screen testID="s" scroll={false} centred>
          <Text>Still</Text>
        </Screen>
      </ThemeProvider>,
    );
    const [still] = (screen.toJSON() as unknown as Tree).children;
    expect(still?.type).toBe("View");
    expect(flat(still?.props.style)).toMatchObject({
      paddingHorizontal: 16,
      justifyContent: "center",
    });
  });

  it("a form scrolls clear of the keyboard: its height is added below the content (S8 device check)", async () => {
    const listeners = new Map<string, (e: unknown) => void>();
    jest.spyOn(Keyboard, "addListener").mockImplementation((name, fn) => {
      listeners.set(name, fn as (e: unknown) => void);
      return { remove: jest.fn() } as never;
    });
    await render(
      <ThemeProvider scheme="light">
        <Screen testID="s" keyboardAware>
          <Text>Form</Text>
        </Screen>
      </ThemeProvider>,
    );
    const scroller = () => (screen.toJSON() as unknown as Tree).children[0];
    // page.top.sm (20) below the content while the keyboard is closed.
    expect(flat(scroller()?.props.contentContainerStyle).paddingBottom).toBe(20);
    expect(scroller()?.props.keyboardShouldPersistTaps).toBe("handled");
    const show = listeners.get("keyboardWillShow") ?? listeners.get("keyboardDidShow");
    const hide = listeners.get("keyboardWillHide") ?? listeners.get("keyboardDidHide");
    // A 336 point keyboard: 20 + 336 = 356, so the last button can scroll above it.
    await act(async () => show?.({ endCoordinates: { height: 336, screenY: 500 } }));
    expect(flat(scroller()?.props.contentContainerStyle).paddingBottom).toBe(356);
    await act(async () => hide?.({}));
    expect(flat(scroller()?.props.contentContainerStyle).paddingBottom).toBe(20);
    jest.restoreAllMocks();
  });

  it("when the keyboard opens, the field being typed in scrolls above it", async () => {
    const listeners = new Map<string, (e: unknown) => void>();
    jest.spyOn(Keyboard, "addListener").mockImplementation((name, fn) => {
      listeners.set(name, fn as (e: unknown) => void);
      return { remove: jest.fn() } as never;
    });
    // The 0% date's year box, 1,500 points down the form and 56 high.
    jest.spyOn(TextInput.State, "currentlyFocusedInput").mockReturnValue({
      measureLayout: (_to: unknown, done: (x: number, y: number, w: number, h: number) => void) =>
        done(0, 1500, 300, 56),
    } as never);
    const scrollTo = jest.fn();
    const ref = { current: null as unknown };
    await render(
      <ThemeProvider scheme="light">
        <Screen testID="s" keyboardAware scrollRef={ref as never}>
          <Text>Form</Text>
        </Screen>
      </ThemeProvider>,
    );
    const scroller = ref.current as Record<string, unknown>;
    scroller.scrollTo = scrollTo;
    scroller.getInnerViewRef = () => ({});
    const [view] = (screen.toJSON() as unknown as Tree).children;
    if (!view) throw new Error("expected the scroll view");
    const onLayout = view.props.onLayout as (e: unknown) => void;
    await act(async () => onLayout({ nativeEvent: { layout: { height: 700 } } }));
    const show = listeners.get("keyboardWillShow") ?? listeners.get("keyboardDidShow");
    await act(async () => show?.({ endCoordinates: { height: 330, screenY: 500 } }));
    // 700 high, 330 of keyboard, 16 of room (density.gap): 1,500 + 56 + 16 - 370 = 1,202.
    expect(scrollTo).toHaveBeenCalledWith({ y: 1202, animated: false });
    jest.restoreAllMocks();
  });

  it("not a form: no keyboard room and the platform's default taps", async () => {
    await render(
      <ThemeProvider scheme="light">
        <Screen testID="s">
          <Text>Page</Text>
        </Screen>
      </ThemeProvider>,
    );
    const [plain] = (screen.toJSON() as unknown as Tree).children;
    expect(plain?.type).toBe("RCTScrollView");
    expect(plain?.props.keyboardShouldPersistTaps).toBeUndefined();
  });

  it("pads every safe-area edge unless told otherwise", async () => {
    await render(
      <ThemeProvider scheme="light">
        <Screen testID="all">
          <Text>A</Text>
        </Screen>
      </ThemeProvider>,
    );
    expect(screen.getByTestId("all").props.edges).toEqual({
      top: "additive",
      right: "additive",
      bottom: "additive",
      left: "additive",
    });
    await render(
      <ThemeProvider scheme="light">
        <Screen testID="header" edges={["bottom"]}>
          <Text>B</Text>
        </Screen>
      </ThemeProvider>,
    );
    expect(screen.getByTestId("header").props.edges).toMatchObject({
      top: "off",
      bottom: "additive",
    });
  });

  it.each(Object.entries(screenStates))("%s holds at 200%% text", async (_name, props) => {
    await expectHoldsAtDoubleText(<Screen {...props} />);
  });

  it("pull to refresh: the control spins until the refresh settles, then stops, even on failure", async () => {
    let settle: (ok: boolean) => void = () => {};
    const onRefresh = jest.fn(
      () =>
        new Promise<void>((resolve, reject) => {
          settle = (ok) => (ok ? resolve() : reject(new Error("refused")));
        }),
    );
    await render(
      <ThemeProvider scheme="light">
        <Screen testID="s" onRefresh={onRefresh}>
          <Text>Body</Text>
        </Screen>
      </ThemeProvider>,
    );
    expect(refreshControl()?.refreshing).toBe(false);
    await act(async () => {
      void refreshControl()?.onRefresh();
    });
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(refreshControl()?.refreshing).toBe(true);
    // The content stays while it refreshes.
    expect(screen.getByText("Body")).toBeOnTheScreen();
    await act(async () => settle(false));
    expect(refreshControl()?.refreshing).toBe(false);
    expect(screen.getByText("Body")).toBeOnTheScreen();
  });

  it("no refresh control unless asked for", async () => {
    await render(
      <ThemeProvider scheme="light">
        <Screen testID="s">
          <Text>Body</Text>
        </Screen>
      </ThemeProvider>,
    );
    expect(refreshControl()).toBeUndefined();
  });
});
