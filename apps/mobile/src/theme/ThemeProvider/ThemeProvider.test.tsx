import { dark, light } from "@flump/tokens/native";
import { render, screen } from "@testing-library/react-native";
import { Text, useColorScheme } from "react-native";
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

  it("a forced scheme wins over the system setting", async () => {
    mockedScheme.mockReturnValue("light");
    await render(
      <ThemeProvider scheme="dark">
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("probe")).toHaveTextContent(`dark ${dark.colors["surface.canvas"]}`);
  });

  it("useTheme outside the provider throws a clear error", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    await expect(render(<Probe />)).rejects.toThrow("useTheme must be used inside ThemeProvider");
  });
});
