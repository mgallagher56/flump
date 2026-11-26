import { light } from "@flump/tokens/native";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet, type TextStyle } from "react-native";
import { expectHoldsAtDoubleText } from "../../testing/textScale";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { ErrorState } from "./ErrorState";
import { errorStateStates } from "./ErrorState.states";

describe("ErrorState", () => {
  it("names the failure as a heading, says what to do, and retries on the button", async () => {
    const onRetry = jest.fn();
    await render(
      <ThemeProvider scheme="light">
        <ErrorState {...errorStateStates.loadFailed} onRetry={onRetry} />
      </ThemeProvider>,
    );
    expect(screen.getByRole("header")).toHaveTextContent("We could not load your accounts");
    expect(
      screen.getByText("Nothing has changed. Check your connection and try again."),
    ).toBeOnTheScreen();
    expect(onRetry).not.toHaveBeenCalled();
    fireEvent.press(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("takes its own button label", async () => {
    await render(
      <ThemeProvider scheme="light">
        <ErrorState {...errorStateStates.ownLabel} />
      </ThemeProvider>,
    );
    expect(screen.getByRole("button", { name: "Check again" })).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
  });

  it("is not shown in red: the body uses the secondary text colour", async () => {
    await render(
      <ThemeProvider scheme="light">
        <ErrorState {...errorStateStates.loadFailed} />
      </ThemeProvider>,
    );
    const body = StyleSheet.flatten(
      screen.getByText(errorStateStates.loadFailed.body).props.style,
    ) as TextStyle;
    expect(body.color).toBe(light.colors["text.secondary"]);
  });

  it.each(Object.entries(errorStateStates))("%s holds at 200%% text", async (_name, props) => {
    await expectHoldsAtDoubleText(<ErrorState {...props} />);
  });
});
