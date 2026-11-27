import { render, screen, userEvent } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { ThemeCycleButton } from "./ThemeCycleButton";
import { themeCycleButtonStates } from "./ThemeCycleButton.states";

describe("ThemeCycleButton", () => {
  beforeEach(() => jest.useRealTimers());

  it.each([
    ["system", "Colour theme: system. Change to light", "light", "monitor"],
    ["light", "Colour theme: light. Change to dark", "dark", "sun"],
    ["dark", "Colour theme: dark. Change to system", "system", "moon"],
  ] as const)(
    "on %s it says so in web's words, shows its icon and moves to the next",
    async (preference, label, next, icon) => {
      const onChange = jest.fn();
      await render(
        <ThemeProvider scheme="light">
          <ThemeCycleButton preference={preference} onChange={onChange} />
        </ThemeProvider>,
      );
      const button = screen.getByRole("button", { name: label });
      expect(StyleSheet.flatten(button.props.style)).toMatchObject({ minHeight: 48, minWidth: 48 });
      expect(
        screen.getByTestId(`theme-icon-${icon}`, { includeHiddenElements: true }),
      ).toBeTruthy();
      await userEvent.setup().press(button);
      expect(onChange.mock.calls).toEqual([[next]]);
    },
  );

  it("every state has a name for a screen reader", async () => {
    for (const props of Object.values(themeCycleButtonStates)) {
      const view = await render(
        <ThemeProvider scheme="dark">
          <ThemeCycleButton {...props} />
        </ThemeProvider>,
      );
      expect(screen.getByRole("button").props.accessibilityLabel).toMatch(/^Colour theme: /);
      await view.unmount();
    }
  });
});
