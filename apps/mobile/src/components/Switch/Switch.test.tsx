import { dark, light } from "@flump/tokens/native";
import { render, screen, userEvent } from "@testing-library/react-native";
import { Platform, StyleSheet, type ViewStyle } from "react-native";
import { expectHoldsAtDoubleText } from "../../testing/textScale";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { Switch } from "./Switch";
import { switchStates } from "./Switch.states";

// Local WCAG 2 contrast helper until @flump/tokens/contrast is exported for mobile.
type Rgb = readonly [number, number, number];

function parseHex(hex: string): Rgb {
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!match?.[1]) throw new Error(`Expected 6-digit hex colour, got ${hex}`);
  const digits = match[1];
  return [
    Number.parseInt(digits.slice(0, 2), 16),
    Number.parseInt(digits.slice(2, 4), 16),
    Number.parseInt(digits.slice(4, 6), 16),
  ];
}

function blendOver(fg: Rgb, bg: Rgb, alpha: number): Rgb {
  return [
    fg[0] * alpha + bg[0] * (1 - alpha),
    fg[1] * alpha + bg[1] * (1 - alpha),
    fg[2] * alpha + bg[2] * (1 - alpha),
  ];
}

function relativeLuminance(rgb: Rgb): number {
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return r * 0.2126 + g * 0.7152 + b * 0.0722;
}

function contrastRatio(a: Rgb, b: Rgb): number {
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

function visibleEdgeColor(style: ViewStyle): string | null {
  if (typeof style.borderWidth !== "number" || style.borderWidth < 1) return null;
  return typeof style.borderColor === "string" ? style.borderColor : null;
}

function maxContrastAgainst(
  style: ViewStyle,
  opacity: number,
  targetRgb: Rgb,
  surfaceRgb: Rgb,
): number {
  if (typeof style.backgroundColor !== "string") {
    throw new Error("Expected string backgroundColor on switch view");
  }
  const fillRgb = blendOver(parseHex(style.backgroundColor), surfaceRgb, opacity);
  const fillRatio = contrastRatio(fillRgb, targetRgb);
  const edge = visibleEdgeColor(style);
  if (!edge) return fillRatio;
  const edgeRgb = blendOver(parseHex(edge), surfaceRgb, opacity);
  return Math.max(fillRatio, contrastRatio(edgeRgb, targetRgb));
}

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

  it.each([
    ["light", "ios", "disabled", light],
    ["light", "ios", "busy", light],
    ["light", "android", "disabled", light],
    ["light", "android", "busy", light],
    ["dark", "ios", "disabled", dark],
    ["dark", "ios", "busy", dark],
    ["dark", "android", "disabled", dark],
    ["dark", "android", "busy", dark],
  ] as const)(
    "%s %s %s: meets contrast targets for on and off, separates states, and differs from enabled",
    async (scheme, os, inactiveProp, set) => {
      jest.replaceProperty(Platform, "OS", os);
      const inactiveFlags = inactiveProp === "disabled" ? { disabled: true } : { busy: true };
      const label = "Self Assessment";
      const view = await render(
        <ThemeProvider scheme={scheme}>
          <Switch label={label} value={true} onValueChange={jest.fn()} {...inactiveFlags} />
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
          <Switch label={label} value={false} onValueChange={jest.fn()} {...inactiveFlags} />
        </ThemeProvider>,
      );

      const offTrack = StyleSheet.flatten(track().props.style) as ViewStyle;
      const offThumb = StyleSheet.flatten(thumb().props.style) as ViewStyle;
      const offTrackOpacity = typeof offTrack.opacity === "number" ? offTrack.opacity : 1;
      const offThumbOpacity =
        offTrackOpacity * (typeof offThumb.opacity === "number" ? offThumb.opacity : 1);
      const offLabel = StyleSheet.flatten(screen.getByText(label).props.style);

      const surfaces = [
        parseHex(set.colors["surface.canvas"]),
        parseHex(set.colors["surface.card"]),
      ] as const;

      for (const surfaceRgb of surfaces) {
        expect(
          maxContrastAgainst(onTrack, onTrackOpacity, surfaceRgb, surfaceRgb),
        ).toBeGreaterThanOrEqual(3);
        expect(
          maxContrastAgainst(offTrack, offTrackOpacity, surfaceRgb, surfaceRgb),
        ).toBeGreaterThanOrEqual(3);

        const onTrackFillRgb = blendOver(
          parseHex(String(onTrack.backgroundColor)),
          surfaceRgb,
          onTrackOpacity,
        );
        const offTrackFillRgb = blendOver(
          parseHex(String(offTrack.backgroundColor)),
          surfaceRgb,
          offTrackOpacity,
        );

        expect(
          maxContrastAgainst(onThumb, onThumbOpacity, onTrackFillRgb, surfaceRgb),
        ).toBeGreaterThanOrEqual(3);
        expect(
          maxContrastAgainst(offThumb, offThumbOpacity, offTrackFillRgb, surfaceRgb),
        ).toBeGreaterThanOrEqual(3);

        if (os === "android") {
          expect(
            maxContrastAgainst(onThumb, onThumbOpacity, surfaceRgb, surfaceRgb),
          ).toBeGreaterThanOrEqual(3);
          expect(
            maxContrastAgainst(offThumb, offThumbOpacity, surfaceRgb, surfaceRgb),
          ).toBeGreaterThanOrEqual(3);
        }

        expect(contrastRatio(onTrackFillRgb, offTrackFillRgb)).toBeGreaterThanOrEqual(1.5);
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
    ["light", "ios", light, { width: 51, height: 31, padding: 2, marginVertical: 0 }, 27],
    ["light", "android", light, { width: 36, height: 14, padding: 0, marginVertical: 3 }, 20],
    ["dark", "ios", dark, { width: 51, height: 31, padding: 2, marginVertical: 0 }, 27],
    ["dark", "android", dark, { width: 36, height: 14, padding: 0, marginVertical: 3 }, 20],
  ] as const)(
    "%s %s: enabled styles are unchanged",
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
});
