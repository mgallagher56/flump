import { dark, light } from "@flump/tokens/native";
import { render, screen, userEvent } from "@testing-library/react-native";
import { StyleSheet, type TextStyle, type ViewStyle } from "react-native";
import { expectHoldsAtDoubleText } from "../../testing/textScale";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { Button } from "./Button";
import { buttonStates } from "./Button.states";
import { IOS_PRESSED_OPACITY, pressedStyle, rippleFor } from "./Button.styles";

const boxOf = (name: string) =>
  StyleSheet.flatten(screen.getByRole("button", { name }).props.style) as ViewStyle;
const labelOf = (name: string) =>
  StyleSheet.flatten(screen.getByText(name).props.style) as TextStyle;

describe("Button", () => {
  it("primary is the teal fill with the foreground label, in each theme", async () => {
    await render(
      <ThemeProvider scheme="light">
        <Button label="Save" />
      </ThemeProvider>,
    );
    expect(boxOf("Save").backgroundColor).toBe(light.colors["primary.solid"]);
    expect(labelOf("Save").color).toBe(light.colors["primary.foreground"]);

    await render(
      <ThemeProvider scheme="dark">
        <Button label="Save" />
      </ThemeProvider>,
    );
    expect(boxOf("Save").backgroundColor).toBe(dark.colors["primary.solid"]);
  });

  it.each([
    ["secondary", "surface.card", "border.strong", "text.primary"],
    ["outline", null, "primary", "primary"],
    ["danger", "status.danger.solid", null, "text.onContrast"],
    ["dangerSubtle", null, "status.danger.border", "status.danger.text"],
  ] as const)("%s uses the web recipe's tokens", async (variant, fill, edge, label) => {
    await render(
      <ThemeProvider scheme="light">
        <Button variant={variant} label="Go" />
      </ThemeProvider>,
    );
    const box = boxOf("Go");
    expect(box.backgroundColor).toBe(fill ? light.colors[fill] : "transparent");
    expect(box.borderColor).toBe(edge ? light.colors[edge] : "transparent");
    expect(labelOf("Go").color).toBe(light.colors[label]);
  });

  it("every size is at least 48 high; lg is 56", async () => {
    await render(
      <ThemeProvider scheme="light">
        <Button size="sm" label="Small" />
        <Button size="lg" label="Large" />
      </ThemeProvider>,
    );
    expect(boxOf("Small").minHeight).toBe(48);
    // control.lg (48) plus spacing 2 (8).
    expect(boxOf("Large").minHeight).toBe(56);
  });

  it("disabled uses the muted label and the theme's disabled fill, and is announced", async () => {
    await render(
      <ThemeProvider scheme="dark">
        <Button disabled label="Save" />
      </ThemeProvider>,
    );
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    expect(boxOf("Save").backgroundColor).toBe(dark.colors["surface.subtle"]);
    expect(labelOf("Save").color).toBe(dark.colors["text.muted"]);
  });

  it("pending keeps its colours, is busy and ignores presses", async () => {
    const onPress = jest.fn();
    await render(
      <ThemeProvider scheme="light">
        <Button pending onPress={onPress} label="Saving" />
      </ThemeProvider>,
    );
    const button = screen.getByRole("button", { name: "Saving" });
    expect(button).toBeBusy();
    expect(boxOf("Saving").backgroundColor).toBe(light.colors["primary.solid"]);
    await userEvent.setup().press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it("a ready button calls onPress once", async () => {
    const onPress = jest.fn();
    await render(
      <ThemeProvider scheme="light">
        <Button onPress={onPress} label="Save" />
      </ThemeProvider>,
    );
    await userEvent.setup().press(screen.getByRole("button", { name: "Save" }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("ripples on Android in the variant's colour, never when disabled", () => {
    const theme = { colors: light.colors } as Parameters<typeof rippleFor>[2];
    expect(rippleFor("primary", false, theme)).toEqual({ color: light.colors["primary.hover"] });
    expect(rippleFor("danger", false, theme)).toEqual({
      color: light.colors["status.danger.border"],
    });
    expect(rippleFor("primary", true, theme)).toBeUndefined();
  });

  it("dims only when pressed, and only on iOS", () => {
    expect(pressedStyle(true, "ios")).toEqual({ opacity: IOS_PRESSED_OPACITY });
    expect(pressedStyle(false, "ios")).toBeNull();
    expect(pressedStyle(true, "android")).toBeNull();
  });

  it("link variant can be announced as a link", async () => {
    await render(
      <ThemeProvider scheme="light">
        <Button variant="link" accessibilityRole="link" label="Privacy notice" />
      </ThemeProvider>,
    );
    expect(screen.getByRole("link", { name: "Privacy notice" })).toBeOnTheScreen();
  });

  it.each(Object.entries(buttonStates))("%s holds at 200%% text", async (_name, props) => {
    await expectHoldsAtDoubleText(<Button {...props} />);
  });
});
