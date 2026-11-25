import { render, screen, userEvent } from "@testing-library/react-native";
import { Linking } from "react-native";
import { expectHoldsAtDoubleText } from "../../testing/textScale";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { SignIn, type SignInProps } from "./SignIn";

jest.mock("expo-router", () => {
  const { Fragment } = require("react");
  return { Link: ({ children }: { children: unknown }) => <Fragment>{children}</Fragment> };
});

const base = (): SignInProps => ({
  notice: null,
  pending: false,
  onSignIn: jest.fn(),
  onCreateAccount: jest.fn(),
  marketingOrigin: "https://site.test.invalid",
});

async function show(props: Partial<SignInProps> = {}, scheme: "light" | "dark" = "light") {
  const all = { ...base(), ...props };
  await render(
    <ThemeProvider scheme={scheme}>
      <SignIn {...all} />
    </ThemeProvider>,
  );
  return all;
}

describe("SignIn", () => {
  it("shows the name, the tagline, Sign in and Create account", async () => {
    await show();
    expect(screen.getByRole("header", { name: "Flump" })).toBeOnTheScreen();
    expect(screen.getByText("Finance without the fog")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Create account" })).toBeOnTheScreen();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("Sign in and Create account call their actions", async () => {
    const props = await show({}, "dark");
    const user = userEvent.setup();
    await user.press(screen.getByRole("button", { name: "Sign in" }));
    await user.press(screen.getByRole("button", { name: "Create account" }));
    expect(props.onSignIn).toHaveBeenCalledTimes(1);
    expect(props.onCreateAccount).toHaveBeenCalledTimes(1);
  });

  it("links the privacy notice and terms on the marketing site", async () => {
    const open = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
    await show();
    const user = userEvent.setup();
    await user.press(screen.getByRole("link", { name: "Privacy notice" }));
    await user.press(screen.getByRole("link", { name: "Terms of use" }));
    expect(open.mock.calls).toEqual([
      ["https://site.test.invalid/privacy"],
      ["https://site.test.invalid/terms"],
    ]);
  });

  it("while signing in, Sign in is busy and Create account is disabled", async () => {
    await show({ pending: true });
    expect(screen.getByRole("button", { name: "Sign in" })).toBeBusy();
    expect(screen.getByRole("button", { name: "Create account" })).toBeDisabled();
  });

  it.each([
    ["denied", "Sign-in was refused. Check you are using the right account, then try again."],
    ["failed", "Sign-in did not finish. Try again."],
    ["unavailable", "We could not reach Flump. Check your connection and try again."],
  ] as const)("a %s sign-in says what happened and what to do", async (notice, words) => {
    await show({ notice });
    expect(screen.getByRole("alert")).toHaveTextContent(words);
  });

  it("holds at 200% text with a message showing", async () => {
    await expectHoldsAtDoubleText(<SignIn {...base()} notice="failed" />);
  });
});
