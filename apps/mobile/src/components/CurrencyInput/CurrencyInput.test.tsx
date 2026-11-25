import { dark, light, sizes, textStyles } from "@flump/tokens/native";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet, type TextStyle, type ViewStyle } from "react-native";
import { expectHoldsAtDoubleText } from "../../testing/textScale";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { CurrencyInput, type CurrencyInputProps, parseMoneyInput } from "./CurrencyInput";
import { currencyInputStates } from "./CurrencyInput.states";

const LABEL = "Current account balance";

function renderInput(props: Partial<CurrencyInputProps> = {}, scheme: "light" | "dark" = "light") {
  const onValueChange = jest.fn();
  const ui = (extra: Partial<CurrencyInputProps> = {}) => (
    <ThemeProvider scheme={scheme}>
      <CurrencyInput
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

describe("parseMoneyInput", () => {
  it.each([
    ["1,204.50", 1204.5],
    ["£1204", 1204],
    ["1 000", 1000],
    ["0", 0],
    ["  12.3 ", 12.3],
    ["12.", 12],
    [".5", 0.5],
  ])("reads %p as %p", (text, expected) => {
    expect(parseMoneyInput(text)).toBe(expected);
  });

  it.each(["", "  ", "12.345", "-5", "abc", "£", "1.2.3", "12a"])("reads %p as null", (text) => {
    expect(parseMoneyInput(text)).toBeNull();
  });
});

describe("CurrencyInput", () => {
  it("is a decimal keypad field with the label as its name and no placeholder", async () => {
    const { ui } = renderInput({ accessibilityHint: "Your latest statement balance" });
    await render(ui());
    expect(screen.getByLabelText(LABEL)).toBe(input());
    expect(input().props.keyboardType).toBe("decimal-pad");
    expect(input().props.accessibilityHint).toBe("Your latest statement balance");
    expect(input().props.placeholder).toBeUndefined();
    expect(input().props.allowFontScaling).not.toBe(false);
  });

  it("shows a £ prefix that screen readers skip", async () => {
    const { ui } = renderInput();
    await render(ui());
    expect(screen.queryByText("£")).toBeNull();
    const prefix = screen.getByText("£", { includeHiddenElements: true });
    expect(prefix.props.accessibilityElementsHidden).toBe(true);
  });

  it("reports each change as a parsed amount", async () => {
    const { onValueChange, ui } = renderInput();
    await render(ui());
    await fireEvent.changeText(input(), "1,204.50");
    expect(onValueChange).toHaveBeenLastCalledWith(1204.5);
    expect(input().props.value).toBe("1,204.50");
  });

  it("reports null, never 0, when the field is cleared", async () => {
    const { onValueChange, ui } = renderInput({ value: 50 });
    await render(ui());
    expect(input().props.value).toBe("50");
    await fireEvent.changeText(input(), "");
    expect(onValueChange).toHaveBeenLastCalledWith(null);
    expect(onValueChange).not.toHaveBeenCalledWith(0);
  });

  it("keeps invalid text as typed and reports null", async () => {
    const { onValueChange, ui } = renderInput();
    const view = await render(ui());
    await fireEvent.changeText(input(), "12.345");
    expect(onValueChange).toHaveBeenLastCalledWith(null);
    // The parent passes the null back; the typed text stays.
    await view.rerender(ui({ value: null }));
    await fireEvent(input(), "blur");
    expect(input().props.value).toBe("12.345");
  });

  it("tidies a valid amount when focus leaves", async () => {
    const { ui } = renderInput();
    await render(ui());
    await fireEvent.changeText(input(), "£1204.5");
    await fireEvent(input(), "blur");
    expect(input().props.value).toBe("1,204.50");
    await fireEvent.changeText(input(), "1000");
    await fireEvent(input(), "blur");
    expect(input().props.value).toBe("1,000");
  });

  it("clears when the value is set to null from outside", async () => {
    const { ui } = renderInput({ value: 300 });
    const view = await render(ui());
    expect(input().props.value).toBe("300");
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
      await fireEvent(input(), "blur");
      expect(boxOf().borderColor).toBe(tokens.colors["border.input"]);
    },
  );

  it("types in body.md with tabular numerals, doubled at 200% text", async () => {
    const { ui } = renderInput();
    const view = await render(ui());
    const style = () => StyleSheet.flatten(input().props.style) as TextStyle;
    expect(style().fontSize).toBe(textStyles["body.md"].fontSize);
    expect(style().fontVariant).toEqual(["tabular-nums"]);
    await view.rerender(
      <ThemeProvider scheme="light" textScale={2}>
        <CurrencyInput
          value={null}
          onValueChange={jest.fn()}
          accessibilityLabel={LABEL}
          testID="input"
        />
      </ThemeProvider>,
    );
    expect(style().fontSize).toBe(textStyles["body.md"].fontSize * 2);
  });

  it("announces itself as disabled when not editable", async () => {
    const { ui } = renderInput({ editable: false, value: 900 });
    await render(ui());
    expect(input().props.editable).toBe(false);
    expect(input().props.accessibilityState).toEqual({ disabled: true });
  });

  it("passes submit through", async () => {
    const onSubmitEditing = jest.fn();
    const { ui } = renderInput({ onSubmitEditing });
    await render(ui());
    await fireEvent(input(), "submitEditing");
    expect(onSubmitEditing).toHaveBeenCalledTimes(1);
  });

  it.each(Object.entries(currencyInputStates))("%s holds at 200%% text", async (_name, props) => {
    await expectHoldsAtDoubleText(<CurrencyInput {...props} />);
  });
});
