import { dark, light } from "@flump/tokens/native";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet, type ViewStyle } from "react-native";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { TextField } from "./TextField";
import { textFieldStates } from "./TextField.states";

const ui = (
  props: Partial<Parameters<typeof TextField>[0]> = {},
  scheme: "light" | "dark" = "light",
) => (
  <ThemeProvider scheme={scheme}>
    <TextField
      value="Sam"
      onChangeText={jest.fn()}
      accessibilityLabel="First name"
      testID="field"
      {...props}
    />
  </ThemeProvider>
);

const box = () => StyleSheet.flatten(screen.getByTestId("field-box").props.style) as ViewStyle;

describe("TextField", () => {
  it("is a text input named by its label, at least 48 high, reporting each change", async () => {
    const onChangeText = jest.fn();
    await render(ui({ onChangeText, autoComplete: "given-name" }));
    const input = screen.getByLabelText("First name");
    expect(input.props.value).toBe("Sam");
    expect(input.props.autoComplete).toBe("given-name");
    expect(box().minHeight).toBe(48);
    await fireEvent.changeText(input, "Samira");
    expect(onChangeText.mock.calls).toEqual([["Samira"]]);
  });

  it("calls onBlur when focus leaves, and shows the focus ring while focused", async () => {
    const onBlur = jest.fn();
    await render(ui({ onBlur }));
    const input = screen.getByLabelText("First name");
    await fireEvent(input, "focus");
    expect(box().borderColor).toBe(light.colors["border.focusRing"]);
    await fireEvent(input, "blur");
    expect(onBlur).toHaveBeenCalledTimes(1);
    expect(box().borderColor).toBe(light.colors["border.input"]);
  });

  it("not editable: says so, on a sunken surface", async () => {
    await render(ui({ editable: false }));
    const input = screen.getByLabelText("First name");
    expect(input.props.editable).toBe(false);
    expect(input.props.accessibilityState).toMatchObject({ disabled: true });
    expect(box().backgroundColor).toBe(light.colors["surface.sunken"]);
  });

  it.each([
    ["light", light],
    ["dark", dark],
  ] as const)("%s: a card surface with the input border", async (scheme, set) => {
    await render(ui({}, scheme));
    expect(box()).toMatchObject({
      backgroundColor: set.colors["surface.card"],
      borderColor: set.colors["border.input"],
    });
  });

  it.each(Object.entries(textFieldStates))("%s holds at 200%% text", async (_name, props) => {
    // The typed words are the input's own, not a Text node: their size doubles and the box grows.
    const sizeAt = async (textScale: number) => {
      await render(
        <ThemeProvider scheme="light" textScale={textScale}>
          <TextField {...props} testID="field" />
        </ThemeProvider>,
      );
      const style = StyleSheet.flatten(
        screen.getByLabelText(props.accessibilityLabel).props.style,
      ) as { fontSize: number };
      expect([box().height, box().maxHeight]).toEqual([undefined, undefined]);
      return style.fontSize;
    };
    const normal = await sizeAt(1);
    expect(await sizeAt(2)).toBe(normal * 2);
  });
});
