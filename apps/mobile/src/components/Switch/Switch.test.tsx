import { dark, light } from "@flump/tokens/native";
import { render, screen, userEvent } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { expectHoldsAtDoubleText } from "../../testing/textScale";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { Switch } from "./Switch";
import { switchStates } from "./Switch.states";

/** The platform's switch inside the row: hidden from screen readers, since the row is the control. */
const native = () => screen.getByTestId("switch-native", { includeHiddenElements: true });

describe("Switch", () => {
  beforeEach(() => jest.useRealTimers());

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
    "%s: the native switch shows the value in our colours, primary when on and the strong border when off",
    async (scheme, set) => {
      const view = await render(
        <ThemeProvider scheme={scheme}>
          <Switch {...switchStates.on} />
        </ThemeProvider>,
      );
      expect(native().props.value).toBe(true);
      expect(native().props.onTintColor).toBe(set.colors["primary.solid"]);
      expect(native().props.tintColor).toBe(set.colors["border.strong"]);
      expect(native().props.thumbTintColor).toBe(set.colors["surface.card"]);
      await view.rerender(
        <ThemeProvider scheme={scheme}>
          <Switch {...switchStates.off} />
        </ThemeProvider>,
      );
      expect(native().props.value).toBe(false);
    },
  );

  it.each([
    ["on", switchStates.on, false],
    ["saving", switchStates.saving, true],
    ["disabled", switchStates.disabled, true],
  ] as const)(
    "%s: the native switch is greyed out only when the row is",
    async (_n, props, off) => {
      await render(
        <ThemeProvider scheme="light">
          <Switch {...props} />
        </ThemeProvider>,
      );
      expect(native().props.disabled).toBe(off);
    },
  );

  it("the row is one control: the native switch is hidden from screen readers", async () => {
    await render(
      <ThemeProvider scheme="light">
        <Switch {...switchStates.on} />
      </ThemeProvider>,
    );
    expect(screen.getAllByRole("switch")).toHaveLength(1);
    expect(screen.queryByTestId("switch-native")).toBeNull();
    // Even counting hidden elements there is one switch, the labelled row: the native switch is not
    // an accessibility element itself, since a parent's flags did not hide it on the device check
    // (the wrapper view can be flattened away).
    const switches = screen.getAllByRole("switch", { includeHiddenElements: true });
    expect(switches).toHaveLength(1);
    expect(switches[0]?.props.accessibilityLabel).toBe(switchStates.on.label);
    expect(native().props).toMatchObject({
      accessible: false,
      focusable: false,
      accessibilityElementsHidden: true,
      importantForAccessibility: "no-hide-descendants",
    });
  });

  it("the native switch takes no focus or presses of its own, so the row toggles once", async () => {
    const onValueChange = jest.fn();
    await render(
      <ThemeProvider scheme="light">
        <Switch label="Count" value={false} onValueChange={onValueChange} />
      </ThemeProvider>,
    );
    // Not focusable by a keyboard or switch access, and no touches reach it even if its wrapper
    // view were flattened away: React Native's switch claims every touch it gets and flips itself.
    expect(native().props).toMatchObject({ focusable: false, pointerEvents: "none" });
    await userEvent.setup().press(screen.getByRole("switch"));
    expect(onValueChange.mock.calls).toEqual([[true]]);
  });

  it.each(Object.entries(switchStates))("%s holds at 200%% text", async (_name, props) => {
    await expectHoldsAtDoubleText(<Switch {...props} />);
  });
});
