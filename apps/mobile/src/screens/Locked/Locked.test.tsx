import { fireEvent, render, screen } from "@testing-library/react-native";
import { LOCKED } from "../../copy/accountData";
import { SIGN_OUT } from "../../copy/auth";
import { expectHoldsAtDoubleText } from "../../testing/textScale";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { Locked, type LockedProps } from "./Locked";

async function show(props: Partial<LockedProps> = {}) {
  const onUnlock = jest.fn();
  const onSignOut = jest.fn();
  await render(
    <ThemeProvider scheme="light">
      <Locked phase="locked" onUnlock={onUnlock} onSignOut={onSignOut} {...props} />
    </ThemeProvider>,
  );
  return { onUnlock, onSignOut };
}

describe("Locked", () => {
  it("offers Unlock and Sign out, and no figures", async () => {
    const { onUnlock, onSignOut } = await show();
    expect(screen.getByRole("header")).toHaveTextContent(LOCKED.heading);
    expect(screen.getByText(LOCKED.body)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: LOCKED.unlock }));
    expect(onUnlock).toHaveBeenCalledTimes(1);
    await fireEvent.press(screen.getByRole("button", { name: SIGN_OUT }));
    expect(onSignOut).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/£|\d/)).toBeNull();
  });

  it("with the phone's screen lock removed: says why, and offers only Sign out", async () => {
    await show({ phase: "noScreenLock" });
    expect(screen.getByText(LOCKED.noScreenLock)).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: LOCKED.unlock })).toBeNull();
    expect(screen.getByRole("button", { name: SIGN_OUT })).toBeOnTheScreen();
  });

  it("while the flag is read on a cold start: covered, with nothing to press", async () => {
    await show({ phase: "checking" });
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByTestId("locked")).toBeOnTheScreen();
  });

  it("never calls itself encryption or account protection", () => {
    for (const words of Object.values(LOCKED)) {
      expect(words).not.toMatch(/encrypt|protect|secure|account/i);
    }
  });

  it.each(["locked", "noScreenLock"] as const)("%s holds at 200%% text", async (phase) => {
    await expectHoldsAtDoubleText(
      <Locked phase={phase} onUnlock={() => {}} onSignOut={() => {}} />,
    );
  });
});
