import { dark } from "@flump/tokens/native";
import { act, render, screen } from "@testing-library/react-native";
import { StyleSheet, type ViewStyle } from "react-native";
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

  it("a form sits above the keyboard, and a tap with the keyboard open presses what it lands on", async () => {
    await render(
      <ThemeProvider scheme="light">
        <Screen testID="s" keyboardAware>
          <Text>Form</Text>
        </Screen>
      </ThemeProvider>,
    );
    expect(screen.getByTestId("s-keyboard")).toBeOnTheScreen();
    const [avoider] = (screen.toJSON() as unknown as Tree).children;
    const [scroller] = avoider?.children ?? [];
    expect(scroller?.type).toBe("RCTScrollView");
    expect(scroller?.props.keyboardShouldPersistTaps).toBe("handled");

    // Not a form: no keyboard padding and the platform's default taps.
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
    expect(screen.queryByTestId("s-keyboard")).toBeNull();
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
