import type { AppStateStatus } from "react-native";
import type { AppLockPhase } from "./deviceLock";
import { lockCoversShell, lockHidesShell } from "./useAppLock";

describe("lockHidesShell", () => {
  it.each<[AppLockPhase, boolean]>([
    // Locked, or still reading the flag on a cold start: nothing of the shell is rendered.
    ["checking", true],
    ["locked", true],
    ["noScreenLock", true],
    // Unlocked or off: the shell stays mounted, whatever the app is doing.
    ["unlocked", false],
    ["off", false],
  ])("%s: hidden %s", (phase, hidden) => {
    expect(lockHidesShell(phase)).toBe(hidden);
  });
});

describe("lockCoversShell", () => {
  it.each<[AppLockPhase, AppStateStatus, boolean, "ios" | "android", boolean]>([
    // Unlocked on iOS: covered only away from the foreground, so the switcher snapshot is covered.
    ["unlocked", "active", false, "ios", false],
    ["unlocked", "inactive", false, "ios", true],
    ["unlocked", "background", false, "ios", true],
    // Not while the sign-in browser or the phone's own prompt is up.
    ["unlocked", "inactive", true, "ios", false],
    ["unlocked", "background", true, "ios", false],
    // Android: never, FLAG_SECURE blanks the recents card instead.
    ["unlocked", "background", false, "android", false],
    ["unlocked", "inactive", false, "android", false],
    // Off, or locked (the shell is not rendered then): never.
    ["off", "background", false, "ios", false],
    ["locked", "background", false, "ios", false],
  ])("%s, app %s, exempt %s, %s: covered %s", (phase, appState, exempt, os, covered) => {
    expect(lockCoversShell(phase, appState, exempt, os)).toBe(covered);
  });
});
