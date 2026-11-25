import { render, screen, userEvent } from "@testing-library/react-native";
import { Linking } from "react-native";
import { expectHoldsAtDoubleText } from "../../testing/textScale";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { TermsRequired } from "./TermsRequired";

const ORIGIN = "https://m.test.invalid";

describe("TermsRequired", () => {
  it("sends the person to the website, checks again, and offers Sign out", async () => {
    const open = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
    const onRetry = jest.fn();
    const onSignOut = jest.fn();
    await render(
      <ThemeProvider scheme="light">
        <TermsRequired marketingOrigin={ORIGIN} onRetry={onRetry} onSignOut={onSignOut} />
      </ThemeProvider>,
    );
    expect(
      screen.getByRole("header", { name: "Please agree to our terms on the website" }),
    ).toBeOnTheScreen();
    expect(screen.queryByRole("alert")).toBeNull();
    const user = userEvent.setup();
    await user.press(screen.getByRole("link", { name: "Open the Flump website" }));
    expect(open).toHaveBeenCalledWith(ORIGIN);
    await user.press(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    await user.press(screen.getByRole("button", { name: "Sign out" }));
    expect(onSignOut).toHaveBeenCalledTimes(1);
    open.mockRestore();
  });

  it("without onSignOut, offers no Sign out", async () => {
    await render(
      <ThemeProvider scheme="light">
        <TermsRequired marketingOrigin={ORIGIN} onRetry={() => {}} />
      </ThemeProvider>,
    );
    expect(screen.queryByRole("button", { name: "Sign out" })).toBeNull();
  });

  it("holds at 200% text", async () => {
    await expectHoldsAtDoubleText(
      <TermsRequired marketingOrigin={ORIGIN} onRetry={() => {}} onSignOut={() => {}} />,
    );
  });
});
