import { render, screen } from "@testing-library/react-native";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { DevLinks } from "./DevLinks";

jest.mock("expo-router", () => {
  const { Fragment } = require("react");
  return { Link: ({ children }: { children: unknown }) => <Fragment>{children}</Fragment> };
});

describe("DevLinks", () => {
  it("offers the device check and gallery as named links in a development build", async () => {
    await render(
      <ThemeProvider scheme="light">
        <DevLinks />
      </ThemeProvider>,
    );
    expect(screen.getByRole("link", { name: "Device check" })).toBeOnTheScreen();
    expect(screen.getByRole("link", { name: "Component gallery" })).toBeOnTheScreen();
  });
});
