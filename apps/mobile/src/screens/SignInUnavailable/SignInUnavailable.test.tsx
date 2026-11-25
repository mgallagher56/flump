import { render, screen } from "@testing-library/react-native";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { SignInUnavailable } from "./SignInUnavailable";

jest.mock("expo-router", () => {
  const { Fragment } = require("react");
  return { Link: ({ children }: { children: unknown }) => <Fragment>{children}</Fragment> };
});

describe("SignInUnavailable", () => {
  it("names the missing modules, offers no sign-in and keeps the dev screens", async () => {
    await render(
      <ThemeProvider scheme="dark">
        <SignInUnavailable missing={["ExpoCrypto", "ExpoWebBrowser"]} />
      </ThemeProvider>,
    );
    expect(
      screen.getByRole("header", { name: "Sign-in is not available in this app" }),
    ).toBeOnTheScreen();
    expect(screen.getByText(/\(ExpoCrypto, ExpoWebBrowser\)/)).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Sign in" })).toBeNull();
    expect(screen.getByRole("link", { name: "Device check" })).toBeOnTheScreen();
  });
});
