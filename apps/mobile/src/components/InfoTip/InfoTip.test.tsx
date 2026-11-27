import { dark, light } from "@flump/tokens/native";
import { render, screen, userEvent } from "@testing-library/react-native";
import { AccessibilityInfo, StyleSheet, type TextStyle, type ViewStyle } from "react-native";
import { expectHoldsAtDoubleText } from "../../testing/textScale";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { Text } from "../Text";
import { InfoTip } from "./InfoTip";
import { infoTipStates } from "./InfoTip.states";

describe("InfoTip", () => {
  afterEach(() => jest.restoreAllMocks());

  it("starts closed, reveals the body when pressed, announces it, and closes without re-announcing", async () => {
    const announce = jest
      .spyOn(AccessibilityInfo, "announceForAccessibility")
      .mockImplementation(() => {});
    await render(
      <ThemeProvider scheme="light">
        <InfoTip {...infoTipStates.closed} testID="tip" />
      </ThemeProvider>,
    );

    const trigger = screen.getByRole("button", { name: "About Left over each month" });
    expect(trigger.props.accessibilityState).toMatchObject({ expanded: false });
    expect(screen.queryByText(infoTipStates.closed.body)).toBeNull();
    expect(announce).not.toHaveBeenCalled();

    await userEvent.setup().press(trigger);
    expect(
      screen.getByRole("button", { name: "About Left over each month" }).props.accessibilityState,
    ).toMatchObject({ expanded: true });
    expect(screen.getByText(infoTipStates.closed.body)).toBeOnTheScreen();
    expect(announce).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenCalledWith(infoTipStates.closed.body);

    await userEvent
      .setup()
      .press(screen.getByRole("button", { name: "About Left over each month" }));
    expect(
      screen.getByRole("button", { name: "About Left over each month" }).props.accessibilityState,
    ).toMatchObject({ expanded: false });
    expect(screen.queryByText(infoTipStates.closed.body)).toBeNull();
    expect(announce).toHaveBeenCalledTimes(1);
  });

  it("uses a custom accessible label when given and meets the 48 point touch target", async () => {
    await render(
      <ThemeProvider scheme="light">
        <InfoTip
          term="Left over each month"
          body={infoTipStates.closed.body}
          label="Explain left over each month"
          testID="tip"
        />
      </ThemeProvider>,
    );
    const trigger = screen.getByRole("button", { name: "Explain left over each month" });
    const style = StyleSheet.flatten(trigger.props.style) as ViewStyle;
    expect(style.minWidth).toBeGreaterThanOrEqual(48);
    expect(style.minHeight).toBeGreaterThanOrEqual(48);
  });

  it.each([
    ["light", light],
    ["dark", dark],
  ] as const)(
    "uses semantic subtle surface, border and secondary text tokens in %s",
    async (scheme, tokens) => {
      await render(
        <ThemeProvider scheme={scheme}>
          <InfoTip {...infoTipStates.open} testID="tip" />
        </ThemeProvider>,
      );
      const panel = StyleSheet.flatten(screen.getByTestId("tip-body").props.style) as ViewStyle;
      const text = StyleSheet.flatten(
        screen.getByText(infoTipStates.open.body).props.style,
      ) as TextStyle;
      expect(panel.backgroundColor).toBe(tokens.colors["surface.subtle"]);
      expect(panel.borderColor).toBe(tokens.colors.border);
      expect(text.color).toBe(tokens.colors["text.secondary"]);
    },
  );

  it("places an optional label beside the trigger in a row with the panel full width below", async () => {
    await render(
      <ThemeProvider scheme="light">
        <InfoTip {...infoTipStates.closed} testID="tip">
          <Text>Left over each month</Text>
        </InfoTip>
      </ThemeProvider>,
    );
    const row = screen.getByTestId("tip-row");
    expect((StyleSheet.flatten(row.props.style) as ViewStyle).flexDirection).toBe("row");
    expect(screen.getByText("Left over each month")).toBeOnTheScreen();
    await userEvent
      .setup()
      .press(screen.getByRole("button", { name: "About Left over each month" }));
    const tip = screen.getByTestId("tip");
    expect(
      tip.children.map((child) => (child as { props: { testID?: string } }).props.testID),
    ).toEqual(["tip-row", "tip-body"]);
  });

  it("open holds at 200% text", async () => {
    await expectHoldsAtDoubleText(<InfoTip {...infoTipStates.open} />);
  });
});
