import { render, screen, userEvent } from "@testing-library/react-native";
import { expectHoldsAtDoubleText } from "../../testing/textScale";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { SessionEnded } from "./SessionEnded";

describe("SessionEnded", () => {
  it("says the sign-in ended and was removed, and offers Sign in", async () => {
    const onSignIn = jest.fn();
    await render(
      <ThemeProvider scheme="dark">
        <SessionEnded onSignIn={onSignIn} />
      </ThemeProvider>,
    );
    expect(screen.getByRole("header", { name: "You have been signed out" })).toBeOnTheScreen();
    expect(screen.getByText(/removed it from this phone/)).toBeOnTheScreen();
    await userEvent.setup().press(screen.getByRole("button", { name: "Sign in" }));
    expect(onSignIn).toHaveBeenCalledTimes(1);
  });

  it("holds at 200% text", async () => {
    await expectHoldsAtDoubleText(<SessionEnded onSignIn={() => {}} />);
  });
});
