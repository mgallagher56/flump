import { render, screen } from "@testing-library/react-native";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { Misconfigured } from "./Misconfigured";

jest.mock("expo-router", () => {
  const { Fragment } = require("react");
  return { Link: ({ children }: { children: unknown }) => <Fragment>{children}</Fragment> };
});

describe("Misconfigured", () => {
  it("says the build is misconfigured and keeps the dev screens reachable in development", async () => {
    await render(
      <ThemeProvider scheme="dark">
        <Misconfigured />
      </ThemeProvider>,
    );
    expect(screen.getByRole("header", { name: "This build is misconfigured" })).toBeOnTheScreen();
    expect(screen.getByRole("link", { name: "Device check" })).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Sign in" })).toBeNull();
  });
});
