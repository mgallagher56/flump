import { dark, light } from "@flump/tokens/native";
import { act, render, screen } from "@testing-library/react-native";
import { Appearance, AppState, type AppStateStatus, useColorScheme } from "react-native";
import { Text } from "../../components/Text";
import { ThemeProvider, useTheme } from "./ThemeProvider";

jest.mock("react-native/Libraries/Utilities/useColorScheme", () => ({
  __esModule: true,
  default: jest.fn(),
}));
const mockedScheme = jest.mocked(useColorScheme);

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
    mockedScheme.mockReturnValue(system as never);
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

  it("reads the system setting again when the app comes back to the front", async () => {
    mockedScheme.mockReturnValue("light");
    const listeners: ((state: AppStateStatus) => void)[] = [];
    jest.spyOn(AppState, "addEventListener").mockImplementation((_type, listener) => {
      listeners.push(listener as (state: AppStateStatus) => void);
      return { remove: jest.fn() } as never;
    });
    const getScheme = jest.spyOn(Appearance, "getColorScheme").mockReturnValue("light");
    await render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("probe")).toHaveTextContent(
      `light ${light.colors["surface.canvas"]}`,
    );
    // Switched to dark in the phone's settings while the app was in the background.
    getScheme.mockReturnValue("dark");
    await act(async () => {
      for (const listener of listeners) listener("active");
    });
    expect(screen.getByTestId("probe")).toHaveTextContent(`dark ${dark.colors["surface.canvas"]}`);
    jest.restoreAllMocks();
  });

  it("a forced scheme wins over the system setting", async () => {
    mockedScheme.mockReturnValue("light");
    await render(
      <ThemeProvider scheme="dark">
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("probe")).toHaveTextContent(`dark ${dark.colors["surface.canvas"]}`);
  });

  it("carries the scheme's shadows from the tokens", async () => {
    mockedScheme.mockReturnValue("light");
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
