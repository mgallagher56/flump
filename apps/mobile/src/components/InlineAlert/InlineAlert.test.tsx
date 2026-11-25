import { dark, light } from "@flump/tokens/native";
import { render, screen } from "@testing-library/react-native";
import { StyleSheet, type TextStyle, type ViewStyle } from "react-native";
import { expectHoldsAtDoubleText } from "../../testing/textScale";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { InlineAlert } from "./InlineAlert";
import { inlineAlertStates } from "./InlineAlert.states";

const boxOf = () => StyleSheet.flatten(screen.getByRole("alert").props.style) as ViewStyle;
const textOf = (message: string) =>
  StyleSheet.flatten(screen.getByText(message).props.style) as TextStyle;

describe("InlineAlert", () => {
  it("is an alert that screen readers announce, with the message as its words", async () => {
    await render(
      <ThemeProvider scheme="light">
        <InlineAlert message="Sign-in did not finish. Try again." />
      </ThemeProvider>,
    );
    const alert = screen.getByRole("alert");
    expect(alert.props.accessibilityLiveRegion).toBe("polite");
    expect(screen.getByText("Sign-in did not finish. Try again.")).toBeOnTheScreen();
  });

  it.each([
    ["light", light],
    ["dark", dark],
  ] as const)("danger uses the danger tokens in %s", async (scheme, tokens) => {
    await render(
      <ThemeProvider scheme={scheme}>
        <InlineAlert message="Went wrong." />
      </ThemeProvider>,
    );
    expect(boxOf().backgroundColor).toBe(tokens.colors["status.danger.bg"]);
    expect(boxOf().borderColor).toBe(tokens.colors["status.danger.border"]);
    expect(textOf("Went wrong.").color).toBe(tokens.colors["status.danger.text"]);
  });

  it("info uses the info surface and ordinary text, not red", async () => {
    await render(
      <ThemeProvider scheme="light">
        <InlineAlert tone="info" message="A notice." />
      </ThemeProvider>,
    );
    expect(boxOf().backgroundColor).toBe(light.colors["status.info.bg"]);
    expect(boxOf().borderColor).toBe(light.colors["status.info.border"]);
    expect(textOf("A notice.").color).toBe(light.colors["text.primary"]);
  });

  it.each(Object.entries(inlineAlertStates))("%s holds at 200%% text", async (_name, props) => {
    await expectHoldsAtDoubleText(<InlineAlert {...props} />);
  });
});
