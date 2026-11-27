import { dark, light } from "@flump/tokens/native";
import { render, screen, userEvent, within } from "@testing-library/react-native";
import { StyleSheet, type ViewStyle } from "react-native";
import { expectHoldsAtDoubleText } from "../../testing/textScale";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { OptionList } from "./OptionList";
import { optionListStates } from "./OptionList.states";

describe("OptionList", () => {
  beforeEach(() => jest.useRealTimers());

  it("is a radio group named by its label, one radio per option, the chosen one checked", async () => {
    await render(
      <ThemeProvider scheme="light">
        <OptionList {...optionListStates.theme} testID="theme" />
      </ThemeProvider>,
    );
    // Not `accessible` itself, which would make one element of the whole list on iOS: found by id.
    const group = screen.getByTestId("theme");
    expect([group.props.accessibilityRole, group.props.accessibilityLabel]).toEqual([
      "radiogroup",
      "Colour theme",
    ]);
    const radios = within(group).getAllByRole("radio");
    expect(
      radios.map((r) => [r.props.accessibilityLabel, r.props.accessibilityState.checked]),
    ).toEqual([
      ["System", true],
      ["Light", false],
      ["Dark", false],
    ]);
    // Position in the group, as a screen reader reads a native radio list.
    expect(radios.map((r) => r.props.accessibilityHint)).toEqual(["1 of 3", "2 of 3", "3 of 3"]);
    for (const radio of radios) {
      expect(StyleSheet.flatten(radio.props.style)).toMatchObject({ minHeight: 48, minWidth: 48 });
    }
    expect(screen.getByTestId("theme-dark")).toBe(radios[2]);
  });

  it("pressing an option chooses it; pressing the chosen one asks for nothing", async () => {
    const onChange = jest.fn();
    await render(
      <ThemeProvider scheme="light">
        <OptionList {...optionListStates.theme} onChange={onChange} />
      </ThemeProvider>,
    );
    const user = userEvent.setup();
    await user.press(screen.getByRole("radio", { name: "Dark" }));
    await user.press(screen.getByRole("radio", { name: "System" }));
    expect(onChange.mock.calls).toEqual([["dark"]]);
  });

  it("disabled, every option ignores presses, says it is disabled, and the choice is unchanged", async () => {
    const onChange = jest.fn();
    await render(
      <ThemeProvider scheme="light">
        <OptionList {...optionListStates.disabled} onChange={onChange} />
      </ThemeProvider>,
    );
    const first = screen.getByRole("radio", { name: "1st" });
    expect(first.props.accessibilityState).toMatchObject({ disabled: true, checked: false });
    expect(screen.getByRole("radio", { name: "2nd" }).props.accessibilityState).toMatchObject({
      disabled: true,
      checked: true,
    });
    await userEvent.setup().press(first);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("enabled by default", async () => {
    await render(
      <ThemeProvider scheme="light">
        <OptionList {...optionListStates.days} />
      </ThemeProvider>,
    );
    expect(screen.getByRole("radio", { name: "1st" }).props.accessibilityState).toMatchObject({
      disabled: false,
    });
  });

  it("while saving, every option ignores presses and says it is busy", async () => {
    const onChange = jest.fn();
    await render(
      <ThemeProvider scheme="light">
        <OptionList {...optionListStates.saving} onChange={onChange} />
      </ThemeProvider>,
    );
    const second = screen.getByRole("radio", { name: "2nd" });
    expect(second.props.accessibilityState).toMatchObject({ busy: true });
    await userEvent.setup().press(second);
    expect(onChange).not.toHaveBeenCalled();
  });

  it.each([
    ["light", light],
    ["dark", dark],
  ] as const)("%s: the chosen mark is the primary colour", async (scheme, set) => {
    await render(
      <ThemeProvider scheme={scheme}>
        <OptionList {...optionListStates.days} />
      </ThemeProvider>,
    );
    const dot = screen.getByTestId("option-dot-2", { includeHiddenElements: true });
    expect((StyleSheet.flatten(dot.props.style) as ViewStyle).backgroundColor).toBe(
      set.colors["primary.solid"],
    );
    expect(screen.queryByTestId("option-dot-1", { includeHiddenElements: true })).toBeNull();
  });

  it.each(Object.entries(optionListStates))("%s holds at 200%% text", async (_name, props) => {
    await expectHoldsAtDoubleText(<OptionList {...props} />);
  });
});
