import { render, screen, userEvent } from "@testing-library/react-native";
import { Appearance } from "react-native";
import { AppHeader } from "../../components/AppHeader";
import {
  memoryThemePreferenceStore,
  type ThemePreferenceStore,
} from "../../device/themePreference";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { SettingsPhone } from "./SettingsPhone";

describe("SettingsPhone", () => {
  beforeEach(() => {
    jest.useRealTimers();
    jest.spyOn(Appearance, "setColorScheme").mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  const checked = () =>
    screen
      .getAllByRole("radio")
      .filter((r) => r.props.accessibilityState.checked)
      .map((r) => r.props.accessibilityLabel);

  it("three radio rows, System, Light and Dark, the stored one chosen and the choice stored", async () => {
    const store: ThemePreferenceStore = memoryThemePreferenceStore("dark");
    await render(
      <ThemeProvider store={store}>
        <SettingsPhone />
      </ThemeProvider>,
    );
    expect(screen.getAllByRole("radio").map((r) => r.props.accessibilityLabel)).toEqual([
      "System",
      "Light",
      "Dark",
    ]);
    expect(checked()).toEqual(["Dark"]);
    await userEvent.setup().press(screen.getByRole("radio", { name: "System" }));
    expect(checked()).toEqual(["System"]);
    expect(store.read()).toBe("system");
  });

  it("the header's button and the rows write one choice and agree", async () => {
    await render(
      <ThemeProvider store={memoryThemePreferenceStore("system")}>
        <AppHeader title="This phone" />
        <SettingsPhone />
      </ThemeProvider>,
    );
    const user = userEvent.setup();
    await user.press(screen.getByTestId("header-theme"));
    expect(checked()).toEqual(["Light"]);
    await user.press(screen.getByRole("radio", { name: "Dark" }));
    expect(screen.getByTestId("header-theme").props.accessibilityLabel).toBe(
      "Colour theme: dark. Change to system",
    );
  });
});
