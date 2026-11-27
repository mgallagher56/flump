import { light } from "@flump/tokens/native";
import { render, screen, userEvent } from "@testing-library/react-native";
import { Platform, StyleSheet } from "react-native";
import { APP_LOCK } from "../../copy/accountData";
import { expectHoldsAtDoubleText } from "../../testing/textScale";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { AppLockSetting, type AppLockSettingProps } from "./AppLockSetting";
import { appLockSettingStates } from "./AppLockSetting.states";

async function show(props: Partial<AppLockSettingProps> = {}) {
  const onChange = jest.fn();
  await render(
    <ThemeProvider scheme="light">
      <AppLockSetting value={false} availability="available" onChange={onChange} {...props} />
    </ThemeProvider>,
  );
  return onChange;
}

const toggle = () => screen.getByRole("switch", { name: APP_LOCK.label });

describe("AppLockSetting", () => {
  beforeEach(() => jest.useRealTimers());

  it("is a named switch, off by default, with a hint that claims no more than a screen gate", async () => {
    const onChange = await show();
    expect(toggle().props.accessibilityState.checked).toBe(false);
    expect(toggle().props.accessibilityHint).toBe(APP_LOCK.hint);
    expect(screen.getByText(APP_LOCK.hint)).toBeOnTheScreen();
    expect(APP_LOCK.hint).not.toMatch(/encrypt|protect|secure|account/i);
    await userEvent.setup().press(toggle());
    expect(onChange.mock.calls).toEqual([[true]]);
  });

  it("on: turning it off asks to change to false", async () => {
    const onChange = await show({ value: true });
    expect(toggle().props.accessibilityState.checked).toBe(true);
    await userEvent.setup().press(toggle());
    expect(onChange.mock.calls).toEqual([[false]]);
  });

  it("with no screen lock on the phone: disabled, and says why", async () => {
    const onChange = await show({ availability: "noScreenLock" });
    expect(toggle()).toBeDisabled();
    expect(StyleSheet.flatten(screen.getByText(APP_LOCK.label).props.style).color).toBe(
      light.colors["text.muted"],
    );
    expect(screen.getByText(APP_LOCK.noScreenLock)).toBeOnTheScreen();
    await userEvent.setup().press(toggle());
    expect(onChange).not.toHaveBeenCalled();
  });

  it("while the phone is asking, or still checking, the switch waits in enabled colours", async () => {
    const onChange = await show({ busy: true });
    expect(toggle()).toBeBusy();
    expect(toggle()).toBeDisabled();
    expect(StyleSheet.flatten(screen.getByText(APP_LOCK.label).props.style).color).toBe(
      light.colors["text.primary"],
    );
    expect(
      StyleSheet.flatten(
        screen.getByTestId("switch-track", { includeHiddenElements: true }).props.style,
      ).backgroundColor,
    ).toBe(light.colors["border.strong"]);
    await userEvent.setup().press(toggle());
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByText(APP_LOCK.noScreenLock)).toBeNull();
  });

  it("the whole row is the one switch, at least 48 high, as the shared Switch", async () => {
    await show();
    expect(screen.getAllByRole("switch")).toHaveLength(1);
    expect(toggle()).toHaveStyle({ minHeight: 48 });
  });

  it.each([
    ["android", true],
    ["ios", false],
  ] as const)("on %s, says screenshots are off while it is on: %s", async (os, shown) => {
    jest.replaceProperty(Platform, "OS", os);
    await show();
    expect(screen.queryByText(APP_LOCK.screenshotsOff) !== null).toBe(shown);
    jest.restoreAllMocks();
  });

  it("shows a failure as an alert", async () => {
    await show({ message: APP_LOCK.failed });
    expect(screen.getByRole("alert")).toHaveTextContent(APP_LOCK.failed);
  });

  it.each(Object.entries(appLockSettingStates))("%s holds at 200%% text", async (_n, props) => {
    await expectHoldsAtDoubleText(<AppLockSetting {...props} />);
  });
});
