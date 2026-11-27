import { light } from "@flump/tokens/native";
import { render, screen, userEvent } from "@testing-library/react-native";
import { StyleSheet, type TextStyle } from "react-native";
import { expectHoldsAtDoubleText } from "../../testing/textScale";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { AccountRow } from "./AccountRow";
import { accountRowStates } from "./AccountRow.states";

const ui = (props: Parameters<typeof AccountRow>[0]) => (
  <ThemeProvider scheme="light">
    <AccountRow {...props} />
  </ThemeProvider>
);

describe("AccountRow", () => {
  it("is one link read as name, type and balance, and opens the account", async () => {
    const onPress = jest.fn();
    await render(ui({ ...accountRowStates.jointDebt, onPress }));
    const row = screen.getByRole("link", {
      name: "Residential mortgage, Mortgage · Joint, 50%, £93,000",
    });
    await userEvent.setup().press(row);
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Mortgage · Joint, 50%")).toBeOnTheScreen();
  });

  it("a debt and an overdrawn account are positive figures in the ordinary text colour", async () => {
    await render(ui({ ...accountRowStates.overdrawn, testID: "r" }));
    expect(screen.getByText("£350")).toBeOnTheScreen();
    const style = StyleSheet.flatten(screen.getByText("£350").props.style) as TextStyle;
    expect(style.color).toBe(light.colors["text.primary"]);
    expect(style.fontVariant).toEqual(["tabular-nums"]);
  });

  it("no type line when the name says it; an unknown balance is Not set, never £0", async () => {
    await render(ui(accountRowStates.noBalance));
    expect(screen.getByRole("link", { name: "Pension, Not set" })).toBeOnTheScreen();
    expect(screen.queryByText("£0")).toBeNull();
  });

  it("is at least 48 points high", async () => {
    await render(ui({ ...accountRowStates.asset, testID: "r" }));
    const style = StyleSheet.flatten(screen.getByTestId("r").props.style);
    expect(style.minHeight).toBeGreaterThanOrEqual(48);
  });

  it.each(Object.entries(accountRowStates))("%s holds at 200%% text", async (_name, props) => {
    await expectHoldsAtDoubleText(<AccountRow {...props} />);
  });
});
