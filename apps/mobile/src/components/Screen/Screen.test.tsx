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

  it("a field near the end scrolls above the keyboard once the room below it is laid out (device re-check)", async () => {
    const listeners = new Map<string, (e: unknown) => void>();
    jest.spyOn(Keyboard, "addListener").mockImplementation((name, fn) => {
      listeners.set(name, fn as (e: unknown) => void);
      return { remove: jest.fn() } as never;
    });
    // The 0% date's year box near the end of a short form: 600 down, 56 high.
    jest.spyOn(TextInput.State, "currentlyFocusedInput").mockReturnValue({
      measureLayout: (_to: unknown, done: (x: number, y: number, w: number, h: number) => void) =>
        done(0, 600, 300, 56),
    } as never);
    // A scroll view as the phone's: it cannot scroll past its content's end.
    let content = 800;
    let at = 0;
    const ref = { current: null as unknown };
    await render(
      <ThemeProvider scheme="light">
        <Screen testID="s" keyboardAware scrollRef={ref as never}>
          <Text>Form</Text>
        </Screen>
      </ThemeProvider>,
    );
    const scroller = ref.current as Record<string, unknown>;
    scroller.getInnerViewRef = () => ({});
    scroller.scrollTo = ({ y }: { y: number }) => {
      at = Math.max(0, Math.min(y, content - 700));
    };
    const [view] = (screen.toJSON() as unknown as Tree).children;
    if (!view) throw new Error("expected the scroll view");
    const onLayout = view.props.onLayout as (e: unknown) => void;
    await act(async () => onLayout({ nativeEvent: { layout: { height: 700 } } }));
    const show = listeners.get("keyboardWillShow") ?? listeners.get("keyboardDidShow");
    await act(async () => show?.({ endCoordinates: { height: 330, screenY: 500 } }));
    // The keyboard's 330 below the content lays out: 800 + 330 = 1,130.
    content = 1130;
    // The scroll view as it renders now, with the keyboard open.
    const [opened] = (screen.toJSON() as unknown as Tree).children;
    const onContentSizeChange = opened?.props.onContentSizeChange as (w: number, h: number) => void;
    await act(async () => onContentSizeChange(400, 1130));
    // 600 + 56 + 16 - (700 - 330) = 302, reachable now that the content is 1,130 long.
    expect(at).toBe(302);
    jest.restoreAllMocks();
  });

  it("every content-size change while the keyboard is open brings a hidden field into view (device race)", async () => {
    // Device check after PR 973: tapping the 0% date's year box without scrolling first left it
    // behind the keyboard 2 times in 4. The second try was a one-shot flag set in an effect, so a
    // size change that came before it, or another that spent it, meant the room's own size change
    // never scrolled. Here an earlier change (the content only part grown) spends that one try.
    const listeners = new Map<string, (e: unknown) => void>();
    jest.spyOn(Keyboard, "addListener").mockImplementation((name, fn) => {
      listeners.set(name, fn as (e: unknown) => void);
      return { remove: jest.fn() } as never;
    });
    jest.spyOn(TextInput.State, "currentlyFocusedInput").mockReturnValue({
      measureLayout: (_to: unknown, done: (x: number, y: number, w: number, h: number) => void) =>
        done(0, 600, 300, 56),
    } as never);
    // A scroll view as the phone's: it cannot scroll past its content's end.
    let content = 800;
    let at = 0;
    const ref = { current: null as unknown };
    await render(
      <ThemeProvider scheme="light">
        <Screen testID="s" keyboardAware scrollRef={ref as never}>
          <Text>Form</Text>
        </Screen>
      </ThemeProvider>,
    );
    const scroller = ref.current as Record<string, unknown>;
    scroller.getInnerViewRef = () => ({});
    scroller.scrollTo = ({ y }: { y: number }) => {
      at = Math.max(0, Math.min(y, content - 700));
    };
    const [view] = (screen.toJSON() as unknown as Tree).children;
    if (!view) throw new Error("expected the scroll view");
    const onLayout = view.props.onLayout as (e: unknown) => void;
    await act(async () => onLayout({ nativeEvent: { layout: { height: 700 } } }));
    const show = listeners.get("keyboardWillShow") ?? listeners.get("keyboardDidShow");
    await act(async () => show?.({ endCoordinates: { height: 330, screenY: 500 } }));
    const [opened] = (screen.toJSON() as unknown as Tree).children;
    const onContentSizeChange = opened?.props.onContentSizeChange as (w: number, h: number) => void;
    // First the content is only part grown (900): the scroll stops at its end, 900 - 700 = 200.
    content = 900;
    await act(async () => onContentSizeChange(400, 900));
    expect(at).toBe(200);
    // Then the keyboard's whole room is laid out (1,130): the field must still come into view,
    // 600 + 56 + 16 - (700 - 330) = 302.
    content = 1130;
    await act(async () => onContentSizeChange(400, 1130));
    expect(at).toBe(302);
    jest.restoreAllMocks();
  });

  it("a scroll the phone cut short at the old end is sent again until the field is in view (device trace)", async () => {
    // Device trace on the 0% date's year box (E12 S10, 27 November 2026), 6 tries in 12: the
    // content-size event reached JS before the room effect, both scrolls went out within 10 ms, and
    // the scroll view, not yet holding the taller content (898.7 of 1,211), stopped both at its old
    // end (115.8 for 212.6). No later event came, so the box stayed behind the keyboard.
    jest.useFakeTimers();
    const listeners = new Map<string, (e: unknown) => void>();
    jest.spyOn(Keyboard, "addListener").mockImplementation((name, fn) => {
      listeners.set(name, fn as (e: unknown) => void);
      return { remove: jest.fn() } as never;
    });
    jest.spyOn(TextInput.State, "currentlyFocusedInput").mockReturnValue({
      measureLayout: (_to: unknown, done: (x: number, y: number, w: number, h: number) => void) =>
        done(0, 600, 300, 56),
    } as never);
    // The phone's scroll view: it stops at the end of the content it holds now, and reports where
    // it got to, as Android does after a scroll that moves.
    let native = 800;
    let at = 0;
    const ref = { current: null as unknown };
    await render(
      <ThemeProvider scheme="light">
        <Screen testID="s" keyboardAware scrollRef={ref as never}>
          <Text>Form</Text>
        </Screen>
      </ThemeProvider>,
    );
    const view = () => {
      const [v] = (screen.toJSON() as unknown as Tree).children;
      if (!v) throw new Error("expected the scroll view");
      return v;
    };
    const scroller = ref.current as Record<string, unknown>;
    scroller.getInnerViewRef = () => ({});
    scroller.scrollTo = ({ y }: { y: number }) => {
      const next = Math.max(0, Math.min(y, native - 700));
      if (next === at) return;
      at = next;
      (view().props.onScroll as (e: unknown) => void)({
        nativeEvent: { contentOffset: { y: at }, contentSize: { height: native } },
      });
    };
    await act(async () =>
      (view().props.onLayout as (e: unknown) => void)({ nativeEvent: { layout: { height: 700 } } }),
    );
    const show = listeners.get("keyboardWillShow") ?? listeners.get("keyboardDidShow");
    await act(async () => show?.({ endCoordinates: { height: 330, screenY: 500 } }));
    // The size event reaches JS while the scroll view still holds the old content: cut short at
    // 800 - 700 = 100.
    await act(async () =>
      (view().props.onContentSizeChange as (w: number, h: number) => void)(400, 1130),
    );
    expect(at).toBe(100);
    // A frame later the phone holds the taller content, and no event says so.
    native = 1130;
    await act(async () => jest.advanceTimersByTime(100));
    // 600 + 56 + 16 - (700 - 330) = 302.
    expect(at).toBe(302);
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("when the keyboard opens, the field being typed in scrolls above it", async () => {
    const listeners = new Map<string, (e: unknown) => void>();
    jest.spyOn(Keyboard, "addListener").mockImplementation((name, fn) => {
      listeners.set(name, fn as (e: unknown) => void);
      return { remove: jest.fn() } as never;
    });
    // The 0% date's year box, 1,500 points down the form and 56 high.
    // Measured against the scroll view's content, so y is the field's place in the whole form.
    const inner = { name: "content" };
    const measuredAgainst: unknown[] = [];
    jest.spyOn(TextInput.State, "currentlyFocusedInput").mockReturnValue({
      measureLayout: (to: unknown, done: (x: number, y: number, w: number, h: number) => void) => {
        measuredAgainst.push(to);
        done(0, 1500, 300, 56);
      },
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
    scroller.getInnerViewRef = () => inner;
    const [view] = (screen.toJSON() as unknown as Tree).children;
    if (!view) throw new Error("expected the scroll view");
    const onLayout = view.props.onLayout as (e: unknown) => void;
    await act(async () => onLayout({ nativeEvent: { layout: { height: 700 } } }));
    // Already scrolled 1,000 down: the field's bottom (1,572) is past 1,000 + 370 = 1,370.
    const onScroll = view.props.onScroll as (e: unknown) => void;
    await act(async () => onScroll({ nativeEvent: { contentOffset: { y: 1000 } } }));
    const show = listeners.get("keyboardWillShow") ?? listeners.get("keyboardDidShow");
    await act(async () => show?.({ endCoordinates: { height: 330, screenY: 500 } }));
    // 700 high, 330 of keyboard, 16 of room (density.gap): 1,500 + 56 + 16 - 370 = 1,202, the same
    // target from any scroll position below the field.
    expect(scrollTo).toHaveBeenCalledWith({ y: 1202, animated: false });
    expect(measuredAgainst).toEqual([inner]);
    // Scrolled to 1,300, the field (1,500 to 1,572) sits inside 1,300 to 1,670: no scroll.
    scrollTo.mockClear();
    await act(async () => onScroll({ nativeEvent: { contentOffset: { y: 1300 } } }));
    const hide = listeners.get("keyboardWillHide") ?? listeners.get("keyboardDidHide");
    await act(async () => hide?.({}));
    await act(async () => show?.({ endCoordinates: { height: 330, screenY: 500 } }));
    expect(scrollTo).not.toHaveBeenCalled();
    jest.restoreAllMocks();
  });

  it("not a form: no keyboard room, but taps still act while a keyboard is open", async () => {
    await render(
      <ThemeProvider scheme="light">
        <Screen testID="s">
          <Text>Page</Text>
        </Screen>
      </ThemeProvider>,
    );
    const [plain] = (screen.toJSON() as unknown as Tree).children;
    expect(plain?.type).toBe("RCTScrollView");
    expect(flat(plain?.props.contentContainerStyle).paddingBottom).toBeUndefined();
    expect(plain?.props.onContentSizeChange).toBeUndefined();
    expect(plain?.props.keyboardShouldPersistTaps).toBe("handled");
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
