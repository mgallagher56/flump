import { render, screen, userEvent } from "@testing-library/react-native";
import { expectHoldsAtDoubleText } from "../../testing/textScale";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { Disclosure } from "./Disclosure";
import { disclosureStates } from "./Disclosure.states";

describe("Disclosure", () => {
  it("starts closed, opens and closes, and says which", async () => {
    await render(
      <ThemeProvider scheme="light">
        <Disclosure {...disclosureStates.closed} />
      </ThemeProvider>,
    );
    const user = userEvent.setup();
    const closed = screen.getByRole("button", { name: "Show changes by account" });
    expect(closed.props.accessibilityState).toMatchObject({ expanded: false });
    expect(screen.queryByText(/Each account's change/)).toBeNull();
    await user.press(closed);
    const open = screen.getByRole("button", { name: "Hide changes by account" });
    expect(open.props.accessibilityState).toMatchObject({ expanded: true });
    expect(screen.getByText(/Each account's change/)).toBeOnTheScreen();
    await user.press(open);
    expect(screen.queryByText(/Each account's change/)).toBeNull();
  });

  it.each(Object.entries(disclosureStates))("%s holds at 200%% text", async (_name, props) => {
    await expectHoldsAtDoubleText(<Disclosure {...props} />);
  });
});
