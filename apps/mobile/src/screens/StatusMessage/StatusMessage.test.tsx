import { render, screen } from "@testing-library/react-native";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { StatusMessage } from "./StatusMessage";

describe("StatusMessage", () => {
  it("shows the heading as a header and the body, and leaves the body out when there is none", async () => {
    await render(
      <ThemeProvider scheme="light">
        <StatusMessage heading="A heading" body="Some words." />
      </ThemeProvider>,
    );
    expect(screen.getByRole("header", { name: "A heading" })).toBeOnTheScreen();
    expect(screen.getByText("Some words.")).toBeOnTheScreen();
    await render(
      <ThemeProvider scheme="dark">
        <StatusMessage heading="Only a heading" />
      </ThemeProvider>,
    );
    expect(screen.queryByText("Some words.")).toBeNull();
  });
});
