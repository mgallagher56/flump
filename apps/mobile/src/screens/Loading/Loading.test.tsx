import { render, screen } from "@testing-library/react-native";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { Loading } from "./Loading";

describe("Loading", () => {
  it("is a named progress indicator for screen readers", async () => {
    await render(
      <ThemeProvider scheme="light">
        <Loading />
      </ThemeProvider>,
    );
    expect(screen.getByRole("progressbar", { name: "Loading" })).toBeOnTheScreen();
  });
});
