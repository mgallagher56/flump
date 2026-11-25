import { render, screen, userEvent } from "@testing-library/react-native";
import { expectHoldsAtDoubleText } from "../../testing/textScale";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { Offline } from "./Offline";

describe("Offline", () => {
  it("says the person is still signed in and offers Try again and Sign out", async () => {
    const onRetry = jest.fn();
    const onSignOut = jest.fn();
    await render(
      <ThemeProvider scheme="light">
        <Offline onRetry={onRetry} onSignOut={onSignOut} />
      </ThemeProvider>,
    );
    expect(screen.getByText(/You are still signed in/)).toBeOnTheScreen();
    const user = userEvent.setup();
    await user.press(screen.getByRole("button", { name: "Try again" }));
    await user.press(screen.getByRole("button", { name: "Sign out" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });

  it("holds at 200% text", async () => {
    await expectHoldsAtDoubleText(<Offline onRetry={() => {}} onSignOut={() => {}} />);
  });
});
