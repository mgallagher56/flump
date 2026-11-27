import { dark, light } from "@flump/tokens/native";
import { act, render, screen } from "@testing-library/react-native";
import { Appearance, AppState, type AppStateStatus } from "react-native";
import { Text } from "../../components/Text";
import {
  memoryThemePreferenceStore,
  type ThemePreference,
  type ThemePreferenceStore,
} from "../../device/themePreference";
import { type ThemeChoice, ThemeProvider, useTheme, useThemeChoice } from "./ThemeProvider";

/** The system setting as React Native reports it, and the two ways the app hears it change. */
let systemScheme: "light" | "dark" | null = "light";
let appearanceListeners: ((p: { colorScheme: "light" | "dark" | null }) => void)[] = [];
let appStateListeners: ((state: AppStateStatus) => void)[] = [];
beforeEach(() => {
  systemScheme = "light";
  appearanceListeners = [];
  appStateListeners = [];
  jest.spyOn(Appearance, "getColorScheme").mockImplementation(() => systemScheme);
  jest.spyOn(Appearance, "addChangeListener").mockImplementation((listener) => {
    appearanceListeners.push(listener as (typeof appearanceListeners)[number]);
    return { remove: jest.fn() } as never;
  });
  jest.spyOn(Appearance, "setColorScheme").mockImplementation(() => {});
  jest.spyOn(AppState, "addEventListener").mockImplementation((_type, listener) => {
    appStateListeners.push(listener as (state: AppStateStatus) => void);
    return { remove: jest.fn() } as never;
  });
});
afterEach(() => jest.restoreAllMocks());

function Probe() {
  const theme = useTheme();
  return <Text testID="probe">{`${theme.scheme} ${theme.colors["surface.canvas"]}`}</Text>;
}

function ShadowProbe() {
  return <Text testID="shadow">{useTheme().shadows.card}</Text>;
}

/** The choice the last render saw, for tests that change it. */
let choice: ThemeChoice | undefined;
function ChoiceProbe() {
  choice = useThemeChoice();
  return <Text testID="choice">{choice.preference}</Text>;
}

/** The scheme of every render, the first frame first. */
const frames: string[] = [];
function FirstFrame() {
  frames.push(useTheme().scheme);
  return null;
}

function ScaleProbe() {
  return <Text testID="scale">{String(useTheme().textScale)}</Text>;
}

describe("ThemeProvider", () => {
  it.each([
    ["dark", "dark", dark.colors["surface.canvas"]],
    ["light", "light", light.colors["surface.canvas"]],
    [null, "light", light.colors["surface.canvas"]],
  ] as const)("system %p gives the %s token set", async (system, scheme, canvas) => {
    systemScheme = system;
    await render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("probe")).toHaveTextContent(`${scheme} ${canvas}`);
  });

  it("the two token sets differ, so a wrong scheme would show", async () => {
    expect(dark.colors["surface.canvas"]).not.toBe(light.colors["surface.canvas"]);
  });

  const canvasOf = (scheme: "light" | "dark") =>
    `${scheme} ${(scheme === "dark" ? dark : light).colors["surface.canvas"]}`;

  it("follows a change made while the app is open", async () => {
    await render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    await act(async () => {
      for (const listener of appearanceListeners) listener({ colorScheme: "dark" });
    });
    expect(screen.getByTestId("probe")).toHaveTextContent(canvasOf("dark"));
  });

  it("reads the setting again on return to the front, then still follows a change while open", async () => {
    await render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("probe")).toHaveTextContent(canvasOf("light"));
    // Switched to dark in the phone's settings while the app was in the background, unheard.
    systemScheme = "dark";
    await act(async () => {
      for (const listener of appStateListeners) listener("active");
    });
    expect(screen.getByTestId("probe")).toHaveTextContent(canvasOf("dark"));
    // Back to light from quick settings with the app open: heard, even though light was the
    // value the app last heard from that listener.
    await act(async () => {
      for (const listener of appearanceListeners) listener({ colorScheme: "light" });
    });
    expect(screen.getByTestId("probe")).toHaveTextContent(canvasOf("light"));
  });

  it("a forced scheme wins over the system setting", async () => {
    systemScheme = "light";
    await render(
      <ThemeProvider scheme="dark">
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("probe")).toHaveTextContent(`dark ${dark.colors["surface.canvas"]}`);
  });

  it("carries the scheme's shadows from the tokens", async () => {
    systemScheme = "light";
    await render(
      <ThemeProvider scheme="dark">
        <ShadowProbe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("shadow")).toHaveTextContent(dark.shadows.card);
    expect(dark.shadows.card).not.toBe(light.shadows.card);
  });

  it("text scale is 1 unless a preview sets it", async () => {
    await render(
      <ThemeProvider scheme="light">
        <ScaleProbe />
        <ThemeProvider scheme="dark" textScale={2}>
          <ScaleProbe />
        </ThemeProvider>
      </ThemeProvider>,
    );
    expect(screen.getAllByTestId("scale").map((n) => n.props.children)).toEqual(["1", "2"]);
  });

  it("a release build ignores the preview text scale", async () => {
    const globals = globalThis as unknown as { __DEV__: boolean };
    const wasDev = globals.__DEV__;
    globals.__DEV__ = false;
    try {
      await render(
        <ThemeProvider scheme="light" textScale={2}>
          <ScaleProbe />
        </ThemeProvider>,
      );
      expect(screen.getByTestId("scale")).toHaveTextContent("1");
    } finally {
      globals.__DEV__ = wasDev;
    }
  });

  describe("the stored choice (E12 S9)", () => {
    /** A store that records reads and writes. */
    function recordingStore(initial: ThemePreference): ThemePreferenceStore & { writes: string[] } {
      const inner = memoryThemePreferenceStore(initial);
      const writes: string[] = [];
      return {
        writes,
        read: jest.fn(() => inner.read()),
        write: jest.fn(async (p: ThemePreference) => {
          writes.push(p);
          await inner.write(p);
        }),
      };
    }

    it.each([
      ["dark", "light", "dark"],
      ["light", "dark", "light"],
      ["system", "dark", "dark"],
    ] as const)(
      "stored %s with the phone on %s draws %s on the first frame",
      async (stored, phone, drawn) => {
        systemScheme = phone;
        const store = recordingStore(stored);
        frames.length = 0;
        await render(
          <ThemeProvider store={store}>
            <FirstFrame />
          </ThemeProvider>,
        );
        expect(frames[0]).toBe(drawn);
        expect(store.read).toHaveBeenCalledTimes(1);
      },
    );

    it("a choice applies at once, is stored, and tells the platform for alerts and the keyboard", async () => {
      const store = recordingStore("system");
      await render(
        <ThemeProvider store={store}>
          <Probe />
          <ChoiceProbe />
        </ThemeProvider>,
      );
      expect(Appearance.setColorScheme).toHaveBeenLastCalledWith("auto");
      await act(async () => choice?.setPreference("dark"));
      expect(screen.getByTestId("probe")).toHaveTextContent(canvasOf("dark"));
      expect(screen.getByTestId("choice")).toHaveTextContent("dark");
      expect(Appearance.setColorScheme).toHaveBeenLastCalledWith("dark");
      await act(async () => choice?.setPreference("light"));
      expect(screen.getByTestId("probe")).toHaveTextContent(canvasOf("light"));
      expect(Appearance.setColorScheme).toHaveBeenLastCalledWith("light");
      expect(store.writes).toEqual(["dark", "light"]);
    });

    it("Light or Dark ignores the phone; back on System it follows the phone live again", async () => {
      systemScheme = "dark";
      await render(
        <ThemeProvider store={recordingStore("light")}>
          <Probe />
          <ChoiceProbe />
        </ThemeProvider>,
      );
      expect(screen.getByTestId("probe")).toHaveTextContent(canvasOf("light"));
      await act(async () => {
        for (const listener of appearanceListeners) listener({ colorScheme: "dark" });
      });
      expect(screen.getByTestId("probe")).toHaveTextContent(canvasOf("light"));
      await act(async () => choice?.setPreference("system"));
      expect(screen.getByTestId("probe")).toHaveTextContent(canvasOf("dark"));
      await act(async () => {
        for (const listener of appearanceListeners) listener({ colorScheme: "light" });
      });
      expect(screen.getByTestId("probe")).toHaveTextContent(canvasOf("light"));
    });

    it("a forced scheme (a gallery panel) never tells the platform", async () => {
      await render(
        <ThemeProvider scheme="dark">
          <Probe />
        </ThemeProvider>,
      );
      expect(Appearance.setColorScheme).not.toHaveBeenCalled();
    });
  });

  it("useTheme outside the provider throws a clear error", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    await expect(render(<Probe />)).rejects.toThrow("useTheme must be used inside ThemeProvider");
  });
});
