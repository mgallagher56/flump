import { render, screen, userEvent } from "@testing-library/react-native";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { Settings } from "./Settings";

describe("Settings", () => {
  beforeEach(() => jest.useRealTimers());

  it("lists Profile, This phone, Security and Data, in that order, each opening its page", async () => {
    const onOpen = jest.fn();
    await render(
      <ThemeProvider scheme="light">
        <Settings onOpen={onOpen} />
      </ThemeProvider>,
    );
    const rows = screen.getAllByRole("link");
    expect(rows.map((r) => r.props.testID)).toEqual([
      "settings-row-profile",
      "settings-row-phone",
      "settings-row-security",
      "settings-row-data",
    ]);
    expect(screen.getByRole("link", { name: "This phone" })).toBeOnTheScreen();
    const user = userEvent.setup();
    for (const row of rows) await user.press(row);
    expect(onOpen.mock.calls).toEqual([["profile"], ["phone"], ["security"], ["data"]]);
  });
});
