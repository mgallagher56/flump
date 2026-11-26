import { render, screen, userEvent } from "@testing-library/react-native";
import { Linking } from "react-native";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { NotSetUp } from "./NotSetUp";

describe("NotSetUp", () => {
  beforeEach(() => {
    jest.useRealTimers();
    jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it.each([
    [
      { url: "https://app.test.invalid/app/onboarding", exact: true },
      "Finish setup on the website",
    ],
    [{ url: "https://site.test.invalid", exact: false }, "Open the Flump website"],
  ])(
    "sends the person to the website to set up, saying where the button goes",
    async (setUp, label) => {
      await render(
        <ThemeProvider scheme="light">
          <NotSetUp setUp={setUp} />
        </ThemeProvider>,
      );
      expect(
        screen.getByRole("header", { name: "Finish setting up Flump on the website" }),
      ).toBeOnTheScreen();
      expect(screen.queryByText(/could not|Nothing has changed/)).toBeNull();
      await userEvent.setup().press(screen.getByRole("link", { name: label }));
      expect(Linking.openURL).toHaveBeenCalledWith(setUp.url);
    },
  );
});
