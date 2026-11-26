import { render, screen, userEvent } from "@testing-library/react-native";
import { expectHoldsAtDoubleText } from "../../testing/textScale";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { OutOfStep } from "./OutOfStep";

describe("OutOfStep", () => {
  it("says the app and Flump are out of step, never to check the connection", async () => {
    const onRetry = jest.fn();
    const onSignOut = jest.fn();
    await render(
      <ThemeProvider scheme="light">
        <OutOfStep onRetry={onRetry} onSignOut={onSignOut} />
      </ThemeProvider>,
    );
    expect(screen.getByRole("header")).toHaveTextContent("This app and Flump are out of step");
    expect(screen.getByText(/did not understand Flump's answer/)).toBeOnTheScreen();
    expect(screen.queryByText(/connection/)).toBeNull();
    const user = userEvent.setup();
    await user.press(screen.getByRole("button", { name: "Try again" }));
    await user.press(screen.getByRole("button", { name: "Sign out" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });

  it("holds at 200% text", async () => {
    await expectHoldsAtDoubleText(<OutOfStep onRetry={() => {}} onSignOut={() => {}} />);
  });
});
