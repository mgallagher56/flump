import { dark, light, sizes, textStyles } from "@flump/tokens/native";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet, type TextStyle, type ViewStyle } from "react-native";
import { expectHoldsAtDoubleText } from "../../testing/textScale";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { PercentInput, type PercentInputProps, parsePercentInput } from "./PercentInput";
import { percentInputStates } from "./PercentInput.states";

const LABEL = "Interest rate";

function renderInput(props: Partial<PercentInputProps> = {}, scheme: "light" | "dark" = "light") {
  const onValueChange = jest.fn();
  const ui = (extra: Partial<PercentInputProps> = {}) => (
    <ThemeProvider scheme={scheme}>
      <PercentInput
        value={null}
        onValueChange={onValueChange}
        accessibilityLabel={LABEL}
        testID="input"
        {...props}
        {...extra}
      />
    </ThemeProvider>
  );
  return { onValueChange, ui };
}

const input = () => screen.getByTestId("input");
const boxOf = () => StyleSheet.flatten(input().parent?.props.style) as ViewStyle;

describe("parsePercentInput", () => {
  it.each([
    ["4.5", 2, 4.5],
    ["4.75%", 2, 4.75],
    [" 4.75 % ", 2, 4.75],
    ["1 00", 2, 100],
    ["0", 2, 0],
    ["12.", 2, 12],
    [".5", 2, 0.5],
    ["150", 2, 150],
    ["4.125", 3, 4.125],
    ["50", 0, 50],
    ["50%", 0, 50],
  ])("reads %p with %p decimals as %p", (text, decimals, expected) => {
    expect(parsePercentInput(text, decimals)).toBe(expected);
  });

  it.each([
    ["", 2],
    ["  ", 2],
    ["%", 2],
    ["4.755", 2],
    ["-5", 2],
    ["abc", 2],
    ["4,5", 2],
    ["1.2.3", 2],
    ["%5", 2],
    ["50.5", 0],
    ["50.", 0],
    ["4.1234", 3],
  ])("reads %p with %p decimals as null", (text, decimals) => {
    expect(parsePercentInput(text, decimals)).toBeNull();
  });

  it("allows two decimals when no count is given", () => {
    expect(parsePercentInput("4.75")).toBe(4.75);
    expect(parsePercentInput("4.755")).toBeNull();
  });
});

describe("PercentInput", () => {
  it("is a decimal keypad field with the label as its name and no placeholder", async () => {
    const { ui } = renderInput({ accessibilityHint: "The rate on your latest statement" });
    await render(ui());
    expect(screen.getByLabelText(LABEL)).toBe(input());
    expect(input().props.keyboardType).toBe("decimal-pad");
    expect(input().props.accessibilityHint).toBe("The rate on your latest statement");
    expect(input().props.placeholder).toBeUndefined();
  });

  it("uses the number pad for whole numbers", async () => {
    const { ui } = renderInput({ decimals: 0 });
    await render(ui());
    expect(input().props.keyboardType).toBe("number-pad");
  });

  it("shows a % suffix that screen readers skip", async () => {
    const { ui } = renderInput();
    await render(ui());
    expect(screen.queryByText("%")).toBeNull();
    const suffix = screen.getByText("%", { includeHiddenElements: true });
    expect(suffix.props.accessibilityElementsHidden).toBe(true);
  });

  it("reports each change as a parsed percentage, unclamped", async () => {
    const { onValueChange, ui } = renderInput();
    await render(ui());
    await fireEvent.changeText(input(), "4.75%");
    expect(onValueChange).toHaveBeenLastCalledWith(4.75, "4.75%");
    await fireEvent.changeText(input(), "120");
    expect(onValueChange).toHaveBeenLastCalledWith(120, "120");
  });

  it("refuses a decimal when whole numbers are asked for", async () => {
    const { onValueChange, ui } = renderInput({ decimals: 0 });
    await render(ui());
    await fireEvent.changeText(input(), "50");
    expect(onValueChange).toHaveBeenLastCalledWith(50, "50");
    await fireEvent.changeText(input(), "50.5");
    expect(onValueChange).toHaveBeenLastCalledWith(null, "50.5");
  });

  it("reports null, never 0, when the field is cleared", async () => {
    const { onValueChange, ui } = renderInput({ value: 3.5 });
    await render(ui());
    expect(input().props.value).toBe("3.5");
    await fireEvent.changeText(input(), "");
    expect(onValueChange).toHaveBeenLastCalledWith(null, "");
    expect(onValueChange).not.toHaveBeenCalledWith(0, expect.anything());
  });

  it("keeps invalid text as typed, and tidies a valid figure when focus leaves", async () => {
    const { ui } = renderInput();
    const view = await render(ui());
    await fireEvent.changeText(input(), "4.755");
    await view.rerender(ui({ value: null }));
    await fireEvent(input(), "blur");
    expect(input().props.value).toBe("4.755");
    await fireEvent.changeText(input(), " 4.50 %");
    await fireEvent(input(), "blur");
    expect(input().props.value).toBe("4.5");
  });

  it("follows a new value from outside", async () => {
    const { ui } = renderInput({ value: 3 });
    const view = await render(ui());
    expect(input().props.value).toBe("3");
    await view.rerender(ui({ value: 5.25 }));
    expect(input().props.value).toBe("5.25");
    await view.rerender(ui({ value: null }));
    expect(input().props.value).toBe("");
  });

  it("is at least 48 high", async () => {
    const { ui } = renderInput();
    await render(ui());
    expect(boxOf().minHeight).toBe(sizes["control.lg"]);
    expect(sizes["control.lg"]).toBeGreaterThanOrEqual(48);
  });

  it.each([
    ["light", light],
    ["dark", dark],
  ] as const)(
    "uses the input border, and the focus ring when focused, in %s",
    async (scheme, tokens) => {
      const { ui } = renderInput({}, scheme);
      await render(ui());
      expect(boxOf().borderColor).toBe(tokens.colors["border.input"]);
      await fireEvent(input(), "focus");
      expect(boxOf().borderColor).toBe(tokens.colors["border.focusRing"]);
    },
  );

  it("types with tabular numerals in body.md", async () => {
    const { ui } = renderInput();
    await render(ui());
    const style = StyleSheet.flatten(input().props.style) as TextStyle;
    expect(style.fontSize).toBe(textStyles["body.md"].fontSize);
    expect(style.fontVariant).toEqual(["tabular-nums"]);
  });

  it("announces itself as disabled when not editable", async () => {
    const { ui } = renderInput({ editable: false, value: 3 });
    await render(ui());
    expect(input().props.editable).toBe(false);
    expect(input().props.accessibilityState).toEqual({ disabled: true });
  });

  it.each(Object.entries(percentInputStates))("%s holds at 200%% text", async (_name, props) => {
    await expectHoldsAtDoubleText(<PercentInput {...props} />);
  });
});
