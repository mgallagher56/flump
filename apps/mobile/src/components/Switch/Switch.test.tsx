import { dark, light } from "@flump/tokens/native";
import { render, screen, userEvent } from "@testing-library/react-native";
import { Platform, StyleSheet } from "react-native";
import { expectHoldsAtDoubleText } from "../../testing/textScale";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { Switch } from "./Switch";
import { switchStates } from "./Switch.states";
import { DISABLED_OPACITY } from "./Switch.styles";

/** The drawn switch inside the row: hidden from screen readers, since the row is the control. */
/** The rendered host tree, as `toJSON` gives it. */
interface HostNode {
  type: string;
  children: (HostNode | string)[] | null;
}

const track = () => screen.getByTestId("switch-track", { includeHiddenElements: true });
const thumb = () => screen.getByTestId("switch-thumb", { includeHiddenElements: true });

describe("Switch", () => {
  beforeEach(() => jest.useRealTimers());
  afterEach(() => jest.restoreAllMocks());

  it("is a switch named by its label, with its state and hint, at least 48 high", async () => {
    await render(
      <ThemeProvider scheme="light">
        <Switch {...switchStates.withHint} />
      </ThemeProvider>,
    );
    const control = screen.getByRole("switch", { name: "Self Assessment" });
    expect(control.props.accessibilityState).toMatchObject({ checked: false, disabled: false });
    expect(control.props.accessibilityHint).toBe(switchStates.withHint.hint);
    expect(StyleSheet.flatten(control.props.style)).toMatchObject({ minHeight: 48 });
    // The hint is on screen too, not only read out.
    expect(screen.getByText(switchStates.withHint.hint)).toBeOnTheScreen();
  });

  it.each([
    [true, false],
    [false, true],
  ])("pressed while %s asks for %s", async (value, next) => {
    const onValueChange = jest.fn();
    await render(
      <ThemeProvider scheme="light">
        <Switch label="Count" value={value} onValueChange={onValueChange} />
      </ThemeProvider>,
    );
    expect(screen.getByRole("switch").props.accessibilityState.checked).toBe(value);
    await userEvent.setup().press(screen.getByRole("switch"));
    expect(onValueChange.mock.calls).toEqual([[next]]);
  });

  it.each([
    ["saving", switchStates.saving, { busy: true, disabled: true }],
    ["disabled", switchStates.disabled, { busy: false, disabled: true }],
  ])("%s ignores presses and says so", async (_name, props, state) => {
    const onValueChange = jest.fn();
    await render(
      <ThemeProvider scheme="light">
        <Switch {...props} onValueChange={onValueChange} />
      </ThemeProvider>,
    );
    const control = screen.getByRole("switch");
    expect(control.props.accessibilityState).toMatchObject(state);
    await userEvent.setup().press(control);
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it.each([
    ["light", light],
    ["dark", dark],
  ] as const)(
    "%s: the drawn switch shows the value in our colours, primary when on and the strong border when off",
    async (scheme, set) => {
      const view = await render(
        <ThemeProvider scheme={scheme}>
          <Switch {...switchStates.on} />
        </ThemeProvider>,
      );
      expect(StyleSheet.flatten(track().props.style)).toMatchObject({
        backgroundColor: set.colors["primary.solid"],
        justifyContent: "flex-end",
      });
      expect(StyleSheet.flatten(thumb().props.style)).toMatchObject({
        backgroundColor: set.colors["surface.card"],
      });
      await view.rerender(
        <ThemeProvider scheme={scheme}>
          <Switch {...switchStates.off} />
        </ThemeProvider>,
      );
      // Off: the strong border's colour, and the thumb at the start.
      expect(StyleSheet.flatten(track().props.style)).toMatchObject({
        backgroundColor: set.colors["border.strong"],
        justifyContent: "flex-start",
      });
    },
  );

  it.each([
    ["on", switchStates.on, 1],
    ["saving", switchStates.saving, DISABLED_OPACITY],
    ["disabled", switchStates.disabled, DISABLED_OPACITY],
  ] as const)("%s: the drawn switch is greyed out only when the row is", async (_n, props, o) => {
    await render(
      <ThemeProvider scheme="light">
        <Switch {...props} />
      </ThemeProvider>,
    );
    expect(StyleSheet.flatten(track().props.style).opacity ?? 1).toBe(o);
  });

  it.each([
    // iOS: the 51 by 31 track, a 27 thumb inset by 2.
    ["ios", { width: 51, height: 31, padding: 2, marginVertical: 0 }, 27],
    // Android: the 36 by 14 track, a 20 thumb standing 3 above and below it.
    ["android", { width: 36, height: 14, padding: 0, marginVertical: 3 }, 20],
  ] as const)("%s: drawn to the platform switch's size", async (os, size, thumbSize) => {
    jest.replaceProperty(Platform, "OS", os);
    await render(
      <ThemeProvider scheme="light">
        <Switch {...switchStates.off} />
      </ThemeProvider>,
    );
    expect(StyleSheet.flatten(track().props.style)).toMatchObject(size);
    expect(StyleSheet.flatten(thumb().props.style)).toMatchObject({
      width: thumbSize,
      height: thumbSize,
    });
  });

  it("the row is the only control: no platform switch inside it, one switch for a screen reader", async () => {
    const view = await render(
      <ThemeProvider scheme="light">
        <Switch {...switchStates.on} />
      </ThemeProvider>,
    );
    // The device check: on Android a native switch inside the row was a second clickable,
    // focusable Switch node whatever its props said, so the switch is drawn with plain views. React
    // Native's switch renders as RCTSwitch on iOS and AndroidSwitch on Android.
    const hostTypes = new Set<string>();
    const walk = (node: HostNode | HostNode[] | null) => {
      if (node === null) return;
      for (const n of Array.isArray(node) ? node : [node]) {
        hostTypes.add(n.type);
        for (const child of n.children ?? []) if (typeof child !== "string") walk(child);
      }
    };
    walk(view.toJSON() as HostNode | HostNode[] | null);
    expect([...hostTypes].filter((type) => /switch/i.test(type))).toEqual([]);
    const switches = screen.getAllByRole("switch", { includeHiddenElements: true });
    expect(switches).toHaveLength(1);
    expect(switches[0]?.props.accessibilityLabel).toBe(switchStates.on.label);
    // The drawing is hidden from screen readers; the row carries the state.
    expect(screen.queryByTestId("switch-track")).toBeNull();
  });

  it("one press anywhere on the row is one change", async () => {
    const onValueChange = jest.fn();
    await render(
      <ThemeProvider scheme="light">
        <Switch label="Count" value={false} onValueChange={onValueChange} />
      </ThemeProvider>,
    );
    await userEvent.setup().press(screen.getByText("Count"));
    expect(onValueChange.mock.calls).toEqual([[true]]);
  });

  it.each(Object.entries(switchStates))("%s holds at 200%% text", async (_name, props) => {
    await expectHoldsAtDoubleText(<Switch {...props} />);
  });
});
