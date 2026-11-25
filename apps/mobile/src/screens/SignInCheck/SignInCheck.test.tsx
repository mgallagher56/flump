import { render, screen, userEvent } from "@testing-library/react-native";
import { NotSignedInError, type SignInCheckReport } from "../../auth/signInCheck";
import { MobileConfigError } from "../../config";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { problemText, SignInCheck } from "./SignInCheck";

const report: SignInCheckReport = {
  issuer: "https://issuer.test.invalid/x",
  claimNames: ["exp", "iat", "iss"],
  accessLifetimeSeconds: 300,
  refreshWithoutSecret: "accepted",
  refreshTokenReplaced: true,
  oldRefreshTokenReused: "rejected",
  replacementAfterReuse: "accepted",
  backend: "ok",
};

describe("SignInCheck (dev only)", () => {
  it("runs once on request and shows each answer as a row", async () => {
    const run = jest.fn(async () => report);
    await render(
      <ThemeProvider scheme="light">
        <SignInCheck run={run} />
      </ThemeProvider>,
    );
    await userEvent.setup().press(screen.getByRole("button", { name: "Run the sign-in check" }));
    expect(run).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Issuer: https://issuer.test.invalid/x")).toBeOnTheScreen();
    expect(screen.getByText("Access token lifetime (seconds): 300")).toBeOnTheScreen();
    expect(screen.getByText("Refresh token replaced on use: yes")).toBeOnTheScreen();
    expect(screen.getByText("Old refresh token used again: rejected")).toBeOnTheScreen();
  });

  it("asks for a sign-in first when nothing is stored", async () => {
    await render(
      <ThemeProvider scheme="dark">
        <SignInCheck
          run={async () => {
            throw new NotSignedInError("x");
          }}
        />
      </ThemeProvider>,
    );
    await userEvent.setup().press(screen.getByRole("button", { name: "Run the sign-in check" }));
    expect(screen.getByText(/^Sign in first\. Expo Go cannot finish a sign-in/)).toBeOnTheScreen();
  });

  it("names the missing setting when the build is misconfigured", () => {
    expect(
      problemText(
        new MobileConfigError("missing-client-id", "EXPO_PUBLIC_WORKOS_CLIENT_ID is not set."),
      ),
    ).toBe(
      "This build is misconfigured: EXPO_PUBLIC_WORKOS_CLIENT_ID is not set. Set it in apps/mobile/.env.local and restart Metro.",
    );
  });

  it("for anything else shows only the error's type, never its message", () => {
    const leaky = new TypeError("Network request failed for r_secret_value");
    expect(problemText(leaky)).toBe("The check could not run (TypeError).");
  });
});
