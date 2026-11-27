import { contrast, parseColor } from "@flump/tokens/contrast";
import { dark, durations, light } from "@flump/tokens/native";
import { act, render, screen, userEvent } from "@testing-library/react-native";
import { Platform, StyleSheet, type ViewStyle } from "react-native";
import { expectHoldsAtDoubleText } from "../../testing/textScale";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { Switch } from "./Switch";
import { switchStates } from "./Switch.states";

function withOpacity(color: string, opacity: number): string {
  if (opacity >= 1) return color;
  const { rgb, alpha } = parseColor(color);
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha * opacity})`;
}

function fillContrast(
  style: ViewStyle,
  opacity: number,
  targetBg: string,
  underSurface: string,
): number {
  if (typeof style.backgroundColor !== "string") {
    throw new Error("Expected string backgroundColor on switch view");
  }
  return contrast(withOpacity(style.backgroundColor, opacity), targetBg, underSurface);
}

function edgeContrast(
  style: ViewStyle,
  opacity: number,
  targetBg: string,
  underSurface: string,
  minBorderWidth = 1,
): number {
  expect(typeof style.borderWidth).toBe("number");
  expect(style.borderWidth).toBeGreaterThanOrEqual(minBorderWidth);
  expect(typeof style.borderColor).toBe("string");
  return contrast(withOpacity(String(style.borderColor), opacity), targetBg, underSurface);
}

function switchGeometry(trackStyle: ViewStyle, thumbStyle: ViewStyle) {
  const width = trackStyle.width as number;
  const height = trackStyle.height as number;
  const padding = typeof trackStyle.padding === "number" ? trackStyle.padding : 0;
  const border = typeof trackStyle.borderWidth === "number" ? trackStyle.borderWidth : 0;
  const thumbWidth = thumbStyle.width as number;
  const thumbHeight = thumbStyle.height as number;
  const thumbMarginH =
    typeof thumbStyle.marginHorizontal === "number" ? thumbStyle.marginHorizontal : 0;
  const innerHeight = height - 2 * (border + padding);
  const thumbX =
    trackStyle.justifyContent === "flex-end"
      ? width - border - padding - thumbMarginH - thumbWidth
      : border + padding + thumbMarginH;
  const thumbY = border + padding + (innerHeight - thumbHeight) / 2;
  return {
    outerWidth: width,
    outerHeight: height,
    marginVertical: trackStyle.marginVertical,
    thumbWidth,
    thumbHeight,
    thumbX,
    thumbY,
  };
}

/** The rendered host tree, as `toJSON` gives it. */
interface HostNode {
  type: string;
  children: (HostNode | string)[] | null;
}

const track = () => screen.getByTestId("switch-track", { includeHiddenElements: true });
const thumb = () => screen.getByTestId("switch-thumb", { includeHiddenElements: true });
const busySpinner = () => screen.queryByTestId("switch-busy", { includeHiddenElements: true });

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
    ["busyOn", switchStates.busyOn, { busy: true, disabled: true }],
    ["busyOff", switchStates.busyOff, { busy: true, disabled: true }],
    ["disabledOn", switchStates.disabledOn, { busy: false, disabled: true }],
    ["disabledOff", switchStates.disabledOff, { busy: false, disabled: true }],
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
    // iOS: the 51 by 31 track, a 27 thumb inset by 2.
    ["light", "ios", light, { width: 51, height: 31, padding: 2, marginVertical: 0 }, 27],
    ["dark", "ios", dark, { width: 51, height: 31, padding: 2, marginVertical: 0 }, 27],
    // Android: the 36 by 14 track, a 20 thumb standing 3 above and below it.
    ["light", "android", light, { width: 36, height: 14, padding: 0, marginVertical: 3 }, 20],
    ["dark", "android", dark, { width: 36, height: 14, padding: 0, marginVertical: 3 }, 20],
  ] as const)(
    "%s %s: drawn to the platform switch's size and token colours for on and off",
    async (scheme, os, set, trackSize, thumbSize) => {
      jest.replaceProperty(Platform, "OS", os);
      const label = "Count";
      const view = await render(
        <ThemeProvider scheme={scheme}>
          <Switch label={label} value={true} onValueChange={jest.fn()} />
        </ThemeProvider>,
      );

      expect(StyleSheet.flatten(track().props.style)).toMatchObject({
        ...trackSize,
        borderRadius: trackSize.height / 2,
        backgroundColor: set.colors["primary.solid"],
        justifyContent: "flex-end",
      });
      expect(StyleSheet.flatten(track().props.style).opacity ?? 1).toBe(1);
      expect(StyleSheet.flatten(track().props.style).borderWidth).toBeUndefined();
      expect(StyleSheet.flatten(thumb().props.style)).toMatchObject({
        width: thumbSize,
        height: thumbSize,
        borderRadius: thumbSize / 2,
        borderWidth: StyleSheet.hairlineWidth,
        backgroundColor: set.colors["surface.card"],
        borderColor: set.colors["border.strong"],
      });
      expect(StyleSheet.flatten(screen.getByText(label).props.style).color).toBe(
        set.colors["text.primary"],
      );

      await view.rerender(
        <ThemeProvider scheme={scheme}>
          <Switch label={label} value={false} onValueChange={jest.fn()} />
        </ThemeProvider>,
      );

      // Off: the strong border's colour, and the thumb at the start.
      expect(StyleSheet.flatten(track().props.style)).toMatchObject({
        ...trackSize,
        borderRadius: trackSize.height / 2,
        backgroundColor: set.colors["border.strong"],
        justifyContent: "flex-start",
      });
      expect(StyleSheet.flatten(track().props.style).opacity ?? 1).toBe(1);
      expect(StyleSheet.flatten(track().props.style).borderWidth).toBeUndefined();
      expect(StyleSheet.flatten(thumb().props.style)).toMatchObject({
        width: thumbSize,
        height: thumbSize,
        borderRadius: thumbSize / 2,
        borderWidth: StyleSheet.hairlineWidth,
        backgroundColor: set.colors["surface.card"],
        borderColor: set.colors["border.strong"],
      });
      expect(StyleSheet.flatten(screen.getByText(label).props.style).color).toBe(
        set.colors["text.primary"],
      );
    },
  );

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

  it.each([
    ["ios", true],
    ["ios", false],
    ["android", true],
    ["android", false],
  ] as const)(
    "%s value=%s: disabled track outer size and thumb position match enabled exactly",
    async (os, value) => {
      jest.replaceProperty(Platform, "OS", os);
      const view = await render(
        <ThemeProvider scheme="light">
          <Switch label="Count" value={value} onValueChange={jest.fn()} />
        </ThemeProvider>,
      );
      const enabledGeo = switchGeometry(
        StyleSheet.flatten(track().props.style) as ViewStyle,
        StyleSheet.flatten(thumb().props.style) as ViewStyle,
      );

      await view.rerender(
        <ThemeProvider scheme="light">
          <Switch label="Count" value={value} disabled onValueChange={jest.fn()} />
        </ThemeProvider>,
      );
      const disabledGeo = switchGeometry(
        StyleSheet.flatten(track().props.style) as ViewStyle,
        StyleSheet.flatten(thumb().props.style) as ViewStyle,
      );
      expect(disabledGeo).toEqual(enabledGeo);
    },
  );

  it.each([
    ["light", "ios", light],
    ["light", "android", light],
    ["dark", "ios", dark],
    ["dark", "android", dark],
  ] as const)(
    "%s %s disabled: meets fill and edge contrast targets separately for on and off",
    async (scheme, os, set) => {
      jest.replaceProperty(Platform, "OS", os);
      const label = "Self Assessment";
      const view = await render(
        <ThemeProvider scheme={scheme}>
          <Switch label={label} value={true} disabled onValueChange={jest.fn()} />
        </ThemeProvider>,
      );

      const onTrack = StyleSheet.flatten(track().props.style) as ViewStyle;
      const onThumb = StyleSheet.flatten(thumb().props.style) as ViewStyle;
      const onTrackOpacity = typeof onTrack.opacity === "number" ? onTrack.opacity : 1;
      const onThumbOpacity =
        onTrackOpacity * (typeof onThumb.opacity === "number" ? onThumb.opacity : 1);
      const onLabel = StyleSheet.flatten(screen.getByText(label).props.style);

      await view.rerender(
        <ThemeProvider scheme={scheme}>
          <Switch label={label} value={false} disabled onValueChange={jest.fn()} />
        </ThemeProvider>,
      );

      const offTrack = StyleSheet.flatten(track().props.style) as ViewStyle;
      const offThumb = StyleSheet.flatten(thumb().props.style) as ViewStyle;
      const offTrackOpacity = typeof offTrack.opacity === "number" ? offTrack.opacity : 1;
      const offThumbOpacity =
        offTrackOpacity * (typeof offThumb.opacity === "number" ? offThumb.opacity : 1);
      const offLabel = StyleSheet.flatten(screen.getByText(label).props.style);

      const surfaces = [set.colors["surface.canvas"], set.colors["surface.card"]] as const;

      for (const surface of surfaces) {
        // Disabled on: solid muted track against the page; sunken thumb fill against the track.
        expect(fillContrast(onTrack, onTrackOpacity, surface, surface)).toBeGreaterThanOrEqual(3);
        const onTrackFill = withOpacity(String(onTrack.backgroundColor), onTrackOpacity);
        expect(fillContrast(onThumb, onThumbOpacity, onTrackFill, surface)).toBeGreaterThanOrEqual(
          3,
        );
        // On Android the thumb overhangs the 14pt track and relies on its 1.5pt ring against the page.
        if (os === "android") {
          expect(
            edgeContrast(onThumb, onThumbOpacity, surface, surface, 1.5),
          ).toBeGreaterThanOrEqual(3);
        }

        // Disabled off: sunken track relies on its 1.5pt outline against the page; strong-border
        // thumb fill reads against the sunken track (and against the page on Android).
        expect(
          edgeContrast(offTrack, offTrackOpacity, surface, surface, 1.5),
        ).toBeGreaterThanOrEqual(3);
        const offTrackFill = withOpacity(String(offTrack.backgroundColor), offTrackOpacity);
        expect(
          fillContrast(offThumb, offThumbOpacity, offTrackFill, surface),
        ).toBeGreaterThanOrEqual(3);
        if (os === "android") {
          expect(fillContrast(offThumb, offThumbOpacity, surface, surface)).toBeGreaterThanOrEqual(
            3,
          );
        }

        expect(contrast(onTrackFill, offTrackFill, surface)).toBeGreaterThanOrEqual(1.5);
      }

      expect(onTrackOpacity).toBe(1);
      expect(onThumbOpacity).toBe(1);
      expect(offTrackOpacity).toBe(1);
      expect(offThumbOpacity).toBe(1);
      expect(onTrack.justifyContent).toBe("flex-end");
      expect(offTrack.justifyContent).toBe("flex-start");
      expect(onTrack.backgroundColor).not.toBe(set.colors["primary.solid"]);
      expect(offTrack.backgroundColor).not.toBe(set.colors["border.strong"]);
      expect(onLabel.color).toBe(set.colors["text.muted"]);
      expect(offLabel.color).toBe(set.colors["text.muted"]);
    },
  );

  it.each([
    ["light", "ios", true, light],
    ["light", "ios", false, light],
    ["light", "android", true, light],
    ["light", "android", false, light],
    ["dark", "ios", true, dark],
    ["dark", "ios", false, dark],
    ["dark", "android", true, dark],
    ["dark", "android", false, dark],
  ] as const)(
    "%s %s value=%s: busy keeps enabled colours and label primary while ignoring presses",
    async (scheme, os, value, set) => {
      jest.replaceProperty(Platform, "OS", os);
      const label = "Self Assessment";
      const onValueChange = jest.fn();
      const view = await render(
        <ThemeProvider scheme={scheme}>
          <Switch label={label} value={value} onValueChange={onValueChange} />
        </ThemeProvider>,
      );
      const enabledTrack = StyleSheet.flatten(track().props.style) as ViewStyle;
      const enabledThumb = StyleSheet.flatten(thumb().props.style) as ViewStyle;

      await view.rerender(
        <ThemeProvider scheme={scheme}>
          <Switch label={label} value={value} busy onValueChange={onValueChange} />
        </ThemeProvider>,
      );

      expect(StyleSheet.flatten(screen.getByText(label).props.style).color).toBe(
        set.colors["text.primary"],
      );
      expect(StyleSheet.flatten(track().props.style)).toEqual(enabledTrack);
      expect(StyleSheet.flatten(thumb().props.style)).toEqual(enabledThumb);
      const control = screen.getByRole("switch");
      expect(control.props.accessibilityState).toMatchObject({
        checked: value,
        busy: true,
        disabled: true,
      });
      await userEvent.setup().press(control);
      expect(onValueChange).not.toHaveBeenCalled();
    },
  );

  it("busy shows no spinner on a fast save (< 200 ms), then keeps a shown spinner for at least 400 ms", async () => {
    jest.useFakeTimers();
    const view = await render(
      <ThemeProvider scheme="light">
        <Switch label="Self Assessment" value={true} busy onValueChange={jest.fn()} />
      </ThemeProvider>,
    );
    expect(busySpinner()).toBeNull();

    // Fast save finishes before pendingDelay (200 ms): never shows a spinner.
    await act(async () => jest.advanceTimersByTime(durations.pendingDelay - 1));
    expect(busySpinner()).toBeNull();
    await view.rerender(
      <ThemeProvider scheme="light">
        <Switch label="Self Assessment" value={true} busy={false} onValueChange={jest.fn()} />
      </ThemeProvider>,
    );
    await act(async () => jest.advanceTimersByTime(durations.pendingMinimum));
    expect(busySpinner()).toBeNull();

    // Slow save: spinner appears at 200 ms, hidden from screen readers (the row already says busy).
    await view.rerender(
      <ThemeProvider scheme="light">
        <Switch label="Self Assessment" value={true} busy onValueChange={jest.fn()} />
      </ThemeProvider>,
    );
    await act(async () => jest.advanceTimersByTime(durations.pendingDelay));
    const spinner = busySpinner();
    expect(spinner).not.toBeNull();
    expect(spinner?.props.accessibilityElementsHidden).toBe(true);
    expect(spinner?.props.importantForAccessibility).toBe("no-hide-descendants");

    // Save ends 50 ms after the spinner appeared: it stays for the remaining 350 ms.
    await act(async () => jest.advanceTimersByTime(50));
    await view.rerender(
      <ThemeProvider scheme="light">
        <Switch label="Self Assessment" value={true} busy={false} onValueChange={jest.fn()} />
      </ThemeProvider>,
    );
    await act(async () => jest.advanceTimersByTime(durations.pendingMinimum - 51));
    expect(busySpinner()).not.toBeNull();
    await act(async () => jest.advanceTimersByTime(1));
    expect(busySpinner()).toBeNull();
  });

  it("when both disabled and busy, disabled styles apply and no busy spinner appears", async () => {
    jest.useFakeTimers();
    await render(
      <ThemeProvider scheme="light">
        <Switch label="Self Assessment" value={false} disabled busy onValueChange={jest.fn()} />
      </ThemeProvider>,
    );
    await act(async () => jest.advanceTimersByTime(durations.pendingDelay + 100));
    expect(busySpinner()).toBeNull();
    expect(StyleSheet.flatten(screen.getByText("Self Assessment").props.style).color).toBe(
      light.colors["text.muted"],
    );
  });
});
