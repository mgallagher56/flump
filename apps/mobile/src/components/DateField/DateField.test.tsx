import { dark, light, sizes } from "@flump/tokens/native";
import { fireEvent, render, screen, userEvent } from "@testing-library/react-native";
import { StyleSheet, type ViewStyle } from "react-native";
import { expectHoldsAtDoubleText } from "../../testing/textScale";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { DateField, type DateFieldProps, isoFromParts } from "./DateField";
import { dateFieldStates } from "./DateField.states";

const LABEL = "Fixed rate ends";

function renderField(
  props: Partial<DateFieldProps> = {},
  scheme: "light" | "dark" = "light",
  textScale?: number,
) {
  const onValueChange = jest.fn();
  const ui = (extra: Partial<DateFieldProps> = {}) => (
    <ThemeProvider scheme={scheme} textScale={textScale}>
      <DateField
        label={LABEL}
        value=""
        onValueChange={onValueChange}
        testID="date"
        {...props}
        {...extra}
      />
    </ThemeProvider>
  );
  return { onValueChange, ui };
}

const box = (part: "day" | "month" | "year") => screen.getByTestId(`date-${part}`);
const boxStyle = (part: "day" | "month" | "year") =>
  StyleSheet.flatten(box(part).parent?.props.style) as ViewStyle;
const values = () => [box("day"), box("month"), box("year")].map((b) => b.props.value);

describe("isoFromParts", () => {
  it.each([
    ["29", "2", "2028", "2028-02-29"],
    ["29", "2", "2000", "2000-02-29"],
    ["30", "4", "2026", "2026-04-30"],
    ["31", "12", "2100", "2100-12-31"],
    ["1", "1", "1900", "1900-01-01"],
    ["05", "03", "2021", "2021-03-05"],
    [" 7 ", " 9 ", " 2030 ", "2030-09-07"],
  ])("reads %p %p %p as %p", (day, month, year, expected) => {
    expect(isoFromParts(day, month, year)).toBe(expected);
  });

  it.each([
    ["31", "4", "2026"],
    ["29", "2", "2027"],
    ["29", "2", "1900"],
    ["31", "12", "1899"],
    ["1", "1", "2101"],
    ["0", "1", "2026"],
    ["1", "0", "2026"],
    ["1", "13", "2026"],
    ["32", "1", "2026"],
    ["1", "1", "26"],
    ["", "1", "2026"],
    ["1", "", "2026"],
    ["1", "1", ""],
    ["1.", "1", "2026"],
    ["123", "1", "2026"],
  ])("reads %p %p %p as null", (day, month, year) => {
    expect(isoFromParts(day, month, year)).toBeNull();
  });
});

describe("DateField", () => {
  it("names each number pad box with the field's label and draws the words hidden", async () => {
    const { ui } = renderField();
    await render(ui());
    expect(screen.getByLabelText("Fixed rate ends, day")).toBe(box("day"));
    expect(screen.getByLabelText("Fixed rate ends, month")).toBe(box("month"));
    expect(screen.getByLabelText("Fixed rate ends, year")).toBe(box("year"));
    expect([box("day"), box("month"), box("year")].map((b) => b.props.keyboardType)).toEqual([
      "number-pad",
      "number-pad",
      "number-pad",
    ]);
    expect([box("day"), box("month"), box("year")].map((b) => b.props.maxLength)).toEqual([
      2, 2, 4,
    ]);
    expect(screen.queryByText("Day")).toBeNull();
    expect(screen.getByText("Day", { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByTestId("date").props.accessibilityRole).toBe("none");
  });

  it("shows a saved date in the three boxes", async () => {
    const { ui } = renderField({ value: "2021-03-05" });
    await render(ui());
    expect(values()).toEqual(["5", "3", "2021"]);
  });

  it("reports the date only once the three boxes make a real one", async () => {
    const { onValueChange, ui } = renderField();
    await render(ui());
    await fireEvent.changeText(box("day"), "29");
    expect(onValueChange).toHaveBeenLastCalledWith({ iso: null, blank: false });
    await fireEvent.changeText(box("month"), "2");
    await fireEvent.changeText(box("year"), "2027");
    expect(onValueChange).toHaveBeenLastCalledWith({ iso: null, blank: false });
    await fireEvent.changeText(box("year"), "2028");
    expect(onValueChange).toHaveBeenLastCalledWith({ iso: "2028-02-29", blank: false });
  });

  it("reports blank only when all three boxes are empty", async () => {
    const { onValueChange, ui } = renderField({ value: "2021-03-05" });
    await render(ui());
    await fireEvent.changeText(box("day"), "");
    await fireEvent.changeText(box("month"), "");
    expect(onValueChange).toHaveBeenLastCalledWith({ iso: null, blank: false });
    await fireEvent.changeText(box("year"), " ");
    expect(onValueChange).toHaveBeenLastCalledWith({ iso: null, blank: true });
  });

  it("keeps the typed parts while the parent holds no date, and takes a new date from outside", async () => {
    const { ui } = renderField();
    const view = await render(ui());
    await fireEvent.changeText(box("day"), "31");
    await fireEvent.changeText(box("month"), "4");
    await view.rerender(ui({ value: "" }));
    expect(values()).toEqual(["31", "4", ""]);
    await view.rerender(ui({ value: "2030-11-09" }));
    expect(values()).toEqual(["9", "11", "2030"]);
  });

  it("does not reset the boxes when its own date comes back", async () => {
    const { ui } = renderField();
    const view = await render(ui());
    await fireEvent.changeText(box("day"), "07");
    await fireEvent.changeText(box("month"), "09");
    await fireEvent.changeText(box("year"), "2030");
    await view.rerender(ui({ value: "2030-09-07" }));
    expect(values()).toEqual(["07", "09", "2030"]);
  });

  it("Clear empties the boxes and reports blank; no Clear unless asked for", async () => {
    const { onValueChange, ui } = renderField({ value: "2028-02-29", clearable: true });
    const view = await render(ui());
    const clear = screen.getByTestId("date-clear");
    expect(clear.props.accessibilityLabel).toBe("Clear, Fixed rate ends");
    await userEvent.setup().press(clear);
    expect(onValueChange).toHaveBeenLastCalledWith({ iso: null, blank: true });
    expect(values()).toEqual(["", "", ""]);
    await view.rerender(ui({ clearable: false }));
    expect(screen.queryByTestId("date-clear")).toBeNull();
  });

  it("boxes are at least 48 high, 2, 2 and 4 digits wide, and grow with the text", async () => {
    // A preview scale stands in for the phone's text size (useTextScale).
    const small = renderField({}, "light", 1.5);
    const view = await render(small.ui());
    expect(boxStyle("day").minHeight).toBe(sizes["control.lg"]);
    // 2 digits at 16pt x 0.7 x 1.5, plus 14pt padding and a 1.5pt border each side.
    expect([boxStyle("day").width, boxStyle("month").width, boxStyle("year").width]).toEqual([
      65, 65, 99,
    ]);
    await view.unmount();
    const big = renderField({}, "light", 3);
    await render(big.ui());
    expect([boxStyle("day").width, boxStyle("year").width]).toEqual([99, 166]);
    expect(StyleSheet.flatten(box("year").parent?.parent?.parent?.props.style)).toMatchObject({
      flexDirection: "row",
      flexWrap: "wrap",
    });
  });

  it("a box is never narrower than a 48 point target", async () => {
    const tiny = renderField({}, "light", 0.5);
    await render(tiny.ui());
    expect(boxStyle("day").width).toBe(sizes["control.lg"]);
  });

  it.each([
    ["light", light],
    ["dark", dark],
  ] as const)(
    "uses the input border, and the focus ring on the focused box, in %s",
    async (scheme, tokens) => {
      const { ui } = renderField({}, scheme);
      await render(ui());
      expect(boxStyle("month").borderColor).toBe(tokens.colors["border.input"]);
      await fireEvent(box("month"), "focus");
      expect(boxStyle("month").borderColor).toBe(tokens.colors["border.focusRing"]);
      expect(boxStyle("day").borderColor).toBe(tokens.colors["border.input"]);
      await fireEvent(box("month"), "blur");
      expect(boxStyle("month").borderColor).toBe(tokens.colors["border.input"]);
    },
  );

  it("announces the boxes as disabled when not editable", async () => {
    const { ui } = renderField({ editable: false, clearable: true, value: "2027-06-01" });
    await render(ui());
    expect(box("day").props.editable).toBe(false);
    expect(box("year").props.accessibilityState).toEqual({ disabled: true });
    expect(screen.getByTestId("date-clear").props.accessibilityState).toMatchObject({
      disabled: true,
    });
  });

  it.each(Object.entries(dateFieldStates))("%s holds at 200%% text", async (_name, props) => {
    await expectHoldsAtDoubleText(<DateField {...props} />);
  });
});
