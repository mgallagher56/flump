import { render, screen, userEvent } from "@testing-library/react-native";
import { expectHoldsAtDoubleText } from "../../testing/textScale";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { NotInvited } from "./NotInvited";

describe("NotInvited", () => {
  it("says the account is not invited, as web does, and offers Sign out", async () => {
    const onSignOut = jest.fn();
    await render(
      <ThemeProvider scheme="light">
        <NotInvited onSignOut={onSignOut} />
      </ThemeProvider>,
    );
    expect(
      screen.getByRole("header", { name: "This account has not been invited yet" }),
    ).toBeOnTheScreen();
    expect(screen.queryByRole("alert")).toBeNull();
    await userEvent.setup().press(screen.getByRole("button", { name: "Sign out" }));
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });

  it("holds at 200% text", async () => {
    await expectHoldsAtDoubleText(<NotInvited onSignOut={() => {}} />);
  });
});
