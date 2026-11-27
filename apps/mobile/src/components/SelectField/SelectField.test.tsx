import { dark, light, sizes } from "@flump/tokens/native";
import { act, fireEvent, render, screen, userEvent, within } from "@testing-library/react-native";
import { AccessibilityInfo, Platform, StyleSheet, type ViewStyle } from "react-native";
import { expectHoldsAtDoubleText } from "../../testing/textScale";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { SelectField, type SelectFieldProps } from "./SelectField";
import { selectFieldStates } from "./SelectField.states";

type Ownership = "sole" | "joint";

const OPTIONS = [
  { value: "sole", label: "Just me" },
  { value: "joint", label: "Joint" },
] as const;

function renderSelect(
  props: Partial<SelectFieldProps<Ownership>> = {},
  scheme: "light" | "dark" = "light",
) {
  const onChange = jest.fn();
  const ui = (
    <ThemeProvider scheme={scheme}>
      <SelectField<Ownership>
        label="Ownership"
        options={OPTIONS}
        value="sole"
        onChange={onChange}
        testID="owner"
        {...props}
      />
    </ThemeProvider>
  );
  return { onChange, ui };
}

const row = () => screen.getByTestId("owner");
const sheet = () => screen.queryByTestId("owner-sheet");

async function openSheet() {
  await userEvent.setup().press(row());
  expect(sheet()).not.toBeNull();
}

describe("SelectField", () => {
  beforeEach(() => {
    jest.useRealTimers();
    jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockResolvedValue(false);
  });

  it("is a button read as the label and the chosen option, with a hint that it opens a list", async () => {
    const { ui } = renderSelect({ value: "joint" });
    await render(ui);
    expect(row().props.accessibilityRole).toBe("button");
    expect(row().props.accessibilityLabel).toBe("Ownership, Joint");
    expect(row().props.accessibilityHint).toBe("Opens a list to choose from");
    expect(screen.getByRole("button", { name: "Ownership, Joint" })).toBe(row());
    expect(screen.getByText("Joint")).toBeOnTheScreen();
    expect(screen.getByTestId("select-chevron", { includeHiddenElements: true })).toBeTruthy();
    expect(sheet()).toBeNull();
  });

  it("is at least 48 high", async () => {
    const { ui } = renderSelect();
    await render(ui);
    expect((StyleSheet.flatten(row().props.style) as ViewStyle).minHeight).toBe(
      sizes["control.lg"],
    );
    expect(sizes["control.lg"]).toBeGreaterThanOrEqual(48);
  });

  it("opens a modal sheet titled with the label, holding the options with the chosen one checked", async () => {
    const { ui } = renderSelect({ value: "joint" });
    await render(ui);
    await openSheet();
    const modal = sheet();
    expect(modal?.props.visible).toBe(true);
    expect(modal?.props.animationType).toBe("slide");
    expect(screen.getByRole("header", { name: "Ownership" })).toBeOnTheScreen();
    const radios = within(screen.getByTestId("owner-option")).getAllByRole("radio");
    expect(
      radios.map((r) => [r.props.accessibilityLabel, r.props.accessibilityState.checked]),
    ).toEqual([
      ["Just me", false],
      ["Joint", true],
    ]);
    expect(screen.getByTestId("owner-option-joint")).toBe(radios[1]);
  });

  it("choosing an option reports it and closes the sheet", async () => {
    const { onChange, ui } = renderSelect();
    await render(ui);
    await openSheet();
    await userEvent.setup().press(screen.getByTestId("owner-option-joint"));
    expect(onChange.mock.calls).toEqual([["joint"]]);
    expect(sheet()).toBeNull();
  });

  it("Cancel closes the sheet and changes nothing", async () => {
    const { onChange, ui } = renderSelect();
    await render(ui);
    await openSheet();
    await userEvent.setup().press(screen.getByTestId("owner-cancel"));
    expect(sheet()).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("the Android back button (onRequestClose) closes the sheet and changes nothing", async () => {
    const { onChange, ui } = renderSelect();
    await render(ui);
    await openSheet();
    await fireEvent(sheet() as NonNullable<ReturnType<typeof sheet>>, "requestClose");
    expect(sheet()).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("moves screen reader focus to the title when the sheet shows", async () => {
    // The test renderer has no node handles, so the focus event goes to the title view itself.
    const sendEvent = jest.mocked(AccessibilityInfo.sendAccessibilityEvent);
    sendEvent.mockClear();
    const { ui } = renderSelect();
    await render(ui);
    await openSheet();
    expect(sendEvent).not.toHaveBeenCalled();
    await fireEvent(sheet() as NonNullable<ReturnType<typeof sheet>>, "show");
    expect(sendEvent).toHaveBeenCalledTimes(1);
    const [target, event] = sendEvent.mock.calls[0] ?? [];
    expect(event).toBe("focus");
    const { accessibilityRole, accessibilityLabel } = (
      target as unknown as { props: { accessibilityRole?: string; accessibilityLabel?: string } }
    ).props;
    expect([accessibilityRole, accessibilityLabel]).toEqual(["header", "Ownership"]);
  });

  it("the sheet is modal for screen readers", async () => {
    const { ui } = renderSelect();
    await render(ui);
    await openSheet();
    expect(screen.getByTestId("owner-sheet-body").props.accessibilityViewIsModal).toBe(true);
  });

  it("appears without sliding when the phone asks for less motion", async () => {
    jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockResolvedValue(true);
    const { ui } = renderSelect();
    await render(ui);
    await act(async () => {});
    await openSheet();
    expect(sheet()?.props.animationType).toBe("none");
  });

  it.each([
    ["ios", { presentationStyle: "pageSheet", transparent: undefined }],
    ["android", { presentationStyle: undefined, transparent: true }],
  ] as const)("%s: presents the sheet the platform's way", async (os, expected) => {
    jest.replaceProperty(Platform, "OS", os);
    const { ui } = renderSelect();
    await render(ui);
    // A press through userEvent draws Android's ripple, which the test renderer cannot.
    await fireEvent.press(row());
    expect({
      presentationStyle: sheet()?.props.presentationStyle,
      transparent: sheet()?.props.transparent,
    }).toEqual(expected);
  });

  it("does not open when not editable", async () => {
    const { ui } = renderSelect({ editable: false });
    await render(ui);
    expect(row().props.accessibilityState).toMatchObject({ disabled: true });
    await userEvent.setup().press(row());
    expect(sheet()).toBeNull();
  });

  it.each([
    ["light", light],
    ["dark", dark],
  ] as const)("%s: the row uses the input border and the card surface", async (scheme, tokens) => {
    const { ui } = renderSelect({}, scheme);
    await render(ui);
    const style = StyleSheet.flatten(row().props.style) as ViewStyle;
    expect([style.borderColor, style.backgroundColor]).toEqual([
      tokens.colors["border.input"],
      tokens.colors["surface.card"],
    ]);
  });

  it("persists taps in its option list scroll view while a keyboard is open", async () => {
    const { ui } = renderSelect();
    await render(ui);
    await fireEvent.press(row());
    expect(sheet()).not.toBeNull();
    type Node = { type?: unknown; props: Record<string, unknown>; children?: unknown[] };
    const findScroller = (n: Node): Node | null =>
      n.type === "RCTScrollView"
        ? n
        : ((n.children ?? []) as Node[]).reduce<Node | null>(
            (hit, c) => hit ?? (typeof c === "object" && c ? findScroller(c) : null),
            null,
          );
    const scroller = findScroller(screen.getByTestId("owner-sheet-body") as unknown as Node);
    expect(scroller?.props.keyboardShouldPersistTaps).toBe("handled");
  });

  it.each(Object.entries(selectFieldStates))("%s holds at 200%% text", async (_name, props) => {
    await expectHoldsAtDoubleText(<SelectField {...props} />);
  });
});
