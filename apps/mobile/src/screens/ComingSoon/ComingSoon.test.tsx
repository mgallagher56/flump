import { render, screen, userEvent } from "@testing-library/react-native";
import { Linking } from "react-native";
import { type Shell, ShellContext } from "../../navigation/shell";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { ComingSoon } from "./ComingSoon";

const shellWith = (webAppOrigin: string | null): Shell => ({
  offline: false,
  signOut: jest.fn(),
  retry: jest.fn(),
  marketingOrigin: "https://site.test.invalid",
  webAppOrigin,
});

async function show(shell: Shell) {
  await render(
    <ThemeProvider scheme="light">
      <ShellContext.Provider value={shell}>
        <ComingSoon pageKey="pension" label="Pension" webRoute="/app/pension" />
      </ShellContext.Provider>
    </ThemeProvider>,
  );
}

describe("ComingSoon", () => {
  beforeEach(() => {
    jest.useRealTimers();
    jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it("says the page is on the website, with no figure, and links to the same page there", async () => {
    await show(shellWith("https://app.test.invalid"));
    // The header names the page, so the sentence reads the same for "Cards and loans".
    expect(
      screen.getByText("This page is not in the app yet. You can use it on the Flump website."),
    ).toBeOnTheScreen();
    expect(screen.queryByText(/£|\d/)).toBeNull();
    await userEvent
      .setup()
      .press(screen.getByRole("link", { name: "Open Pension on the website" }));
    expect(Linking.openURL).toHaveBeenCalledWith("https://app.test.invalid/app/pension");
  });

  it("without the web app's address, says the button opens the Flump website, and goes there", async () => {
    await show(shellWith(null));
    expect(screen.queryByRole("link", { name: "Open Pension on the website" })).toBeNull();
    await userEvent
      .setup()
      .press(screen.getByRole("link", { name: /^Open the Flump website\. ./ }));
    expect(Linking.openURL).toHaveBeenCalledWith("https://site.test.invalid");
  });
});
