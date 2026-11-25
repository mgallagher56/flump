import { render, screen, userEvent } from "@testing-library/react-native";
import { NotSignedInError, type SignInCheckReport } from "../../auth/signInCheck";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { SignInCheck } from "./SignInCheck";

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
    expect(screen.getByText("Sign in first.")).toBeOnTheScreen();
  });
});
