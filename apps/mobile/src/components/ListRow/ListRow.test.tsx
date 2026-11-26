import { render, screen, userEvent } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { expectHoldsAtDoubleText } from "../../testing/textScale";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { ListRow } from "./ListRow";
import { listRowStates } from "./ListRow.states";

const chevrons = () => screen.queryAllByTestId("row-chevron", { includeHiddenElements: true });

describe("ListRow", () => {
  it("is a link named by its label, at least 48 high, that calls onPress", async () => {
    jest.useRealTimers();
    const user = userEvent.setup();
    const onPress = jest.fn();
    await render(
      <ThemeProvider scheme="light">
        <ListRow label="Pension" icon="coins" onPress={onPress} />
      </ThemeProvider>,
    );
    const row = screen.getByRole("link", { name: "Pension" });
    expect(StyleSheet.flatten(row.props.style)).toMatchObject({ minHeight: 48, minWidth: 48 });
    await user.press(row);
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(chevrons()).toHaveLength(1);
  });

  it("an action is a button with no chevron", async () => {
    await render(
      <ThemeProvider scheme="light">
        <ListRow {...listRowStates.action} />
      </ThemeProvider>,
    );
    expect(screen.getByRole("button", { name: "Sign out" })).toBeOnTheScreen();
    expect(chevrons()).toHaveLength(0);
  });

  it.each(Object.entries(listRowStates))("%s holds at 200%% text", async (_name, props) => {
    await expectHoldsAtDoubleText(<ListRow {...props} />);
  });
});
