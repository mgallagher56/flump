import { render, screen } from "@testing-library/react-native";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { Welcome } from "./Welcome";

jest.mock("expo-router", () => {
  const { Fragment } = require("react");
  return { Link: ({ children }: { children: unknown }) => <Fragment>{children}</Fragment> };
});

describe("Welcome", () => {
  it("shows the name as a heading and the tagline", async () => {
    await render(
      <ThemeProvider scheme="light">
        <Welcome />
      </ThemeProvider>,
    );
    expect(screen.getByRole("header", { name: "Flump" })).toBeOnTheScreen();
    expect(screen.getByText("Finance without the fog")).toBeOnTheScreen();
    // The logo is decorative beside the name, so a screen reader does not hear "Flump" twice.
    expect(screen.queryByRole("image")).toBeNull();
  });

  it("offers the device check as a named link in a development build", async () => {
    await render(
      <ThemeProvider scheme="dark">
        <Welcome />
      </ThemeProvider>,
    );
    expect(screen.getByRole("link", { name: "Device check" })).toBeOnTheScreen();
    expect(screen.getByRole("link", { name: "Component gallery" })).toBeOnTheScreen();
  });
});
