import { sizes } from "@flump/tokens/native";
import { render, screen, userEvent } from "@testing-library/react-native";
import { StyleSheet, View, type ViewStyle } from "react-native";
import { expectHoldsAtDoubleText } from "../../testing/textScale";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { Text } from "../Text";
import { hasTextChild, Pressable } from "./Pressable";
import { pressableStates } from "./Pressable.states";

const inTheme = (ui: React.ReactElement) => <ThemeProvider scheme="light">{ui}</ThemeProvider>;
const boxOf = (testID: string) =>
  StyleSheet.flatten(screen.getByTestId(testID).props.style) as ViewStyle;

describe("Pressable", () => {
  beforeEach(() => jest.spyOn(console, "error").mockImplementation(() => {}));
  afterEach(() => jest.restoreAllMocks());

  it("is at least 48 by 48 with no style", async () => {
    await render(
      inTheme(
        <Pressable testID="p">
          <Text>Go</Text>
        </Pressable>,
      ),
    );
    // sizes["control.lg"] is 48.
    expect(sizes["control.lg"]).toBe(48);
    expect(boxOf("p")).toMatchObject({ minHeight: 48, minWidth: 48 });
  });

  it("a smaller minimum is raised to 48, a larger one is kept", async () => {
    await render(
      inTheme(
        <>
          <Pressable testID="small" style={{ minHeight: 20, minWidth: 47 }}>
            <Text>A</Text>
          </Pressable>
          <Pressable testID="big" style={() => ({ minHeight: 60, minWidth: 49 })}>
            <Text>B</Text>
          </Pressable>
        </>,
      ),
    );
    expect(boxOf("small")).toMatchObject({ minHeight: 48, minWidth: 48 });
    expect(boxOf("big")).toMatchObject({ minHeight: 60, minWidth: 49 });
  });

  it("a fixed height under 48 throws in development; 48 is allowed", async () => {
    await expect(
      render(
        inTheme(
          <Pressable style={{ height: 47 }}>
            <Text>Go</Text>
          </Pressable>,
        ),
      ),
    ).rejects.toThrow("Pressable height 47 is under the 48 point target.");
    await render(
      inTheme(
        <Pressable testID="ok" style={{ height: 48, width: 48 }}>
          <Text>Go</Text>
        </Pressable>,
      ),
    );
    expect(boxOf("ok").height).toBe(48);
  });

  it("with no text and no label it throws in development", async () => {
    await expect(render(inTheme(<Pressable>{<View />}</Pressable>))).rejects.toThrow(
      "Pressable needs an accessibilityLabel",
    );
  });

  it("with a label and no text it renders, named by the label", async () => {
    await render(
      inTheme(
        <Pressable accessibilityLabel="Open menu">
          <View />
        </Pressable>,
      ),
    );
    expect(screen.getByRole("button", { name: "Open menu" })).toBeOnTheScreen();
  });

  it("takes its role from the prop, defaulting to button", async () => {
    await render(
      inTheme(
        <>
          <Pressable>
            <Text>Default</Text>
          </Pressable>
          <Pressable accessibilityRole="link">
            <Text>Somewhere</Text>
          </Pressable>
        </>,
      ),
    );
    expect(screen.getByRole("button", { name: "Default" })).toBeOnTheScreen();
    expect(screen.getByRole("link", { name: "Somewhere" })).toBeOnTheScreen();
  });

  it("calls onPress, and ignores presses while busy or disabled", async () => {
    const onPress = jest.fn();
    await render(
      inTheme(
        <>
          <Pressable onPress={onPress}>
            <Text>Ready</Text>
          </Pressable>
          <Pressable onPress={onPress} busy>
            <Text>Busy</Text>
          </Pressable>
          <Pressable onPress={onPress} disabled>
            <Text>Off</Text>
          </Pressable>
        </>,
      ),
    );
    // userEvent goes through the responder system, as a finger does; fireEvent would call the
    // component's own onPress prop directly and skip the native Pressable's guard.
    const user = userEvent.setup();
    await user.press(screen.getByText("Busy"));
    await user.press(screen.getByText("Off"));
    expect(onPress).not.toHaveBeenCalled();
    await user.press(screen.getByText("Ready"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("announces busy and disabled", async () => {
    await render(
      inTheme(
        <>
          <Pressable busy>
            <Text>Busy</Text>
          </Pressable>
          <Pressable disabled>
            <Text>Off</Text>
          </Pressable>
        </>,
      ),
    );
    expect(screen.getByRole("button", { name: "Busy" })).toBeBusy();
    expect(screen.getByRole("button", { name: "Off" })).toBeDisabled();
  });

  describe("hasTextChild", () => {
    it.each([
      ["a string", "Go", true],
      ["whitespace only", "  ", false],
      ["a number", 3, true],
      ["Text with words", <Text key="t">Go</Text>, true],
      ["empty Text", <Text key="t"> </Text>, false],
      [
        "text nested in a view",
        <View key="v">
          <Text>Go</Text>
        </View>,
        true,
      ],
      ["a bare view", <View key="v" />, false],
      ["nothing", null, false],
    ] as const)("%s gives %p", (_name, children, expected) => {
      expect(hasTextChild(children)).toBe(expected);
    });
  });

  it.each(Object.entries(pressableStates))("%s holds at 200%% text", async (_name, props) => {
    await expectHoldsAtDoubleText(<Pressable {...props} />);
  });
});
