import { dark, light } from "@flump/tokens/native";
import { act, render, screen } from "@testing-library/react-native";
import { Appearance, AppState, type AppStateStatus } from "react-native";
import { Text } from "../../components/Text";
import { ThemeProvider, useTheme } from "./ThemeProvider";

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

  it("useTheme outside the provider throws a clear error", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    await expect(render(<Probe />)).rejects.toThrow("useTheme must be used inside ThemeProvider");
  });
});
