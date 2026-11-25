import { render, screen, userEvent } from "@testing-library/react-native";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { Home } from "./Home";

jest.mock("expo-router", () => {
  const { Fragment } = require("react");
  return { Link: ({ children }: { children: unknown }) => <Fragment>{children}</Fragment> };
});

describe("Home", () => {
  it("says the person is signed in and offers Sign out", async () => {
    const onSignOut = jest.fn();
    await render(
      <ThemeProvider scheme="light">
        <Home onSignOut={onSignOut} />
      </ThemeProvider>,
    );
    expect(screen.getByRole("header", { name: "You are signed in" })).toBeOnTheScreen();
    await userEvent.setup().press(screen.getByRole("button", { name: "Sign out" }));
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });
});
