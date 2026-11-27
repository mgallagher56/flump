import { dark, light, sizes } from "@flump/tokens/native";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet, type ViewStyle } from "react-native";
import { expectHoldsAtDoubleText } from "../../testing/textScale";
import { ThemeProvider } from "../../theme/ThemeProvider";
import {
  parseWholeNumberInput,
  WholeNumberInput,
  type WholeNumberInputProps,
} from "./WholeNumberInput";
import { wholeNumberInputStates } from "./WholeNumberInput.states";

const LABEL = "Years left";

function renderInput(
  props: Partial<WholeNumberInputProps> = {},
  scheme: "light" | "dark" = "light",
) {
  const onValueChange = jest.fn();
  const ui = (extra: Partial<WholeNumberInputProps> = {}) => (
    <ThemeProvider scheme={scheme}>
      <WholeNumberInput
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

describe("parseWholeNumberInput", () => {
  it.each([
    ["0", 0],
    ["25", 25],
    [" 2 5 ", 25],
    ["007", 7],
    ["60", 60],
  ])("reads %p as %p", (text, expected) => {
    expect(parseWholeNumberInput(text)).toBe(expected);
  });

  it.each(["", "  ", "-1", "2.5", "2.", "abc", "1,000", "1e3", "99999999999999999999"])(
    "reads %p as null",
    (text) => {
      expect(parseWholeNumberInput(text)).toBeNull();
    },
  );
});

describe("WholeNumberInput", () => {
  it("is a number pad field with the label as its name and no placeholder", async () => {
    const { ui } = renderInput({ accessibilityHint: "Up to 50" });
    await render(ui());
    expect(screen.getByLabelText(LABEL)).toBe(input());
    expect(input().props.keyboardType).toBe("number-pad");
    expect(input().props.accessibilityHint).toBe("Up to 50");
    expect(input().props.placeholder).toBeUndefined();
  });

  it("shows the suffix hidden from screen readers, and none when not given", async () => {
    const { ui } = renderInput({ suffix: "years" });
    const view = await render(ui());
    expect(screen.queryByText("years")).toBeNull();
    const suffix = screen.getByText("years", { includeHiddenElements: true });
    expect(suffix.props.accessibilityElementsHidden).toBe(true);
    await view.rerender(ui({ suffix: undefined }));
    expect(screen.queryByText("years", { includeHiddenElements: true })).toBeNull();
  });

  it("reports each change as a whole number, unclamped, and null for a decimal", async () => {
    const { onValueChange, ui } = renderInput();
    await render(ui());
    await fireEvent.changeText(input(), "0");
    expect(onValueChange).toHaveBeenLastCalledWith(0, "0");
    await fireEvent.changeText(input(), "75");
    expect(onValueChange).toHaveBeenLastCalledWith(75, "75");
    await fireEvent.changeText(input(), "7.5");
    expect(onValueChange).toHaveBeenLastCalledWith(null, "7.5");
  });

  it("reports null, never 0, when the field is cleared", async () => {
    const { onValueChange, ui } = renderInput({ value: 12 });
    await render(ui());
    expect(input().props.value).toBe("12");
    await fireEvent.changeText(input(), "");
    expect(onValueChange).toHaveBeenLastCalledWith(null, "");
    expect(onValueChange).not.toHaveBeenCalledWith(0, expect.anything());
  });

  it("tidies leading zeros when focus leaves and follows a new value from outside", async () => {
    const { ui } = renderInput();
    const view = await render(ui());
    await fireEvent.changeText(input(), "007");
    await fireEvent(input(), "blur");
    expect(input().props.value).toBe("7");
    await view.rerender(ui({ value: 30 }));
    expect(input().props.value).toBe("30");
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

  it("announces itself as disabled when not editable", async () => {
    const { ui } = renderInput({ editable: false, value: 3 });
    await render(ui());
    expect(input().props.editable).toBe(false);
    expect(input().props.accessibilityState).toEqual({ disabled: true });
  });

  // A state with no suffix draws no text, so there is nothing to scale.
  it.each(Object.entries(wholeNumberInputStates).filter(([, p]) => "suffix" in p))(
    "%s holds at 200%% text",
    async (_name, props) => {
      await expectHoldsAtDoubleText(<WholeNumberInput {...props} />);
    },
  );
});
