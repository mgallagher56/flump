/**
 * App lock (E12 S9, decided by the coordinator on 27 November 2026): a screen gate on this phone,
 * off by default. While on, the signed-in shell is covered on a cold start and after 60 seconds in
 * the background, until the phone's own biometrics or passcode confirm. It is never a way to sign
 * in and changes nothing on the server or in how the data is stored.
 *
 * The phone is reached through an injected authenticator (expo-local-authentication in
 * `authDeps.ts`) and the flag through an injected secure store, so every path is tested on Node.
 * Rules it keeps:
 * - Only the exact flag value "on" counts; a flag that cannot be read fails closed (locked).
 * - Turning it on or off asks the phone first; nothing is stored on a cancelled prompt.
 * - A failed or cancelled unlock stays locked. A phone whose screen lock was removed while the
 *   lock was on cannot unlock at all: only signing out (which clears the flag) leaves it.
 * - Time in the sign-in browser or in the phone's own prompt never counts as time away.
 * - While it is on (locked or not), screen capture is blocked through the injected
 *   `screenCapture` (Android only, `authDeps.ts`): the recents card is blank and screenshots are
 *   refused. Set from the lock's own phase before anyone hears of it, so from a cold start too;
 *   allowed again when it is turned off or cleared.
 */
import { DEVICE_LOCK_KEY } from "../device/storageKeys";
import type { SecureStoreLike } from "./tokenStore";

/** Back after this long in the background, the app is locked again. */
export const LOCK_AFTER_MS = 60_000;

/** expo-local-authentication's `SecurityLevel.NONE`: no passcode, pattern or biometrics. */
const SECURITY_LEVEL_NONE = 0;
const FLAG_ON = "on";

/** The two expo-local-authentication calls this needs. */
export interface Authenticator {
  getEnrolledLevelAsync(): Promise<number>;
  authenticateAsync(options: {
    promptMessage: string;
    disableDeviceFallback?: boolean;
  }): Promise<{ success: boolean }>;
}

/**
 * `checking`: the flag is being read on a cold start (covered, as locked). `off`: no lock.
 * `unlocked`: on, and confirmed. `locked`: on, waiting for Unlock. `noScreenLock`: on, but the
 * phone has no screen lock left to confirm with, so only signing out leaves it.
 */
export type AppLockPhase = "checking" | "off" | "unlocked" | "locked" | "noScreenLock";

/** React Native's `AppStateStatus`, without importing React Native here. */
type AppStateLike = "active" | "background" | "inactive" | "unknown" | "extension";

/** expo-screen-capture's two calls: Android's FLAG_SECURE on the app's window, and off again. */
export interface ScreenCaptureGuard {
  prevent(): Promise<void>;
  allow(): Promise<void>;
}

export interface AppLockDeps {
  auth: Authenticator;
  store: SecureStoreLike;
  /** Absent on iOS (the cover handles the app switcher there) and in builds without the module. */
  screenCapture?: ScreenCaptureGuard;
  /** expo-secure-store's WHEN_UNLOCKED_THIS_DEVICE_ONLY, as for the refresh token. */
  accessible: number;
  now(): number;
  /** True while the sign-in browser is open: leaving for it is not time away. */
  isExempt(): boolean;
  /** What the phone's prompt says for each action. */
  prompts: { unlock: string; turnOn: string; turnOff: string };
}

export interface AppLock {
  getPhase(): AppLockPhase;
  subscribe(listener: (phase: AppLockPhase) => void): () => void;
  /** Once, on a cold start: reads the flag. */
  start(): Promise<void>;
  /** Every AppState change: times the trips to the background. */
  appStateChanged(next: AppStateLike): void;
  /**
   * True while the sign-in browser or the phone's own prompt is showing (either may background
   * the app on Android): neither is time away, and neither gets the app switcher cover.
   */
  isExempt(): boolean;
  unlock(): Promise<void>;
  /** Whether the phone has a screen lock to confirm with. */
  availability(): Promise<"available" | "noScreenLock">;
  turnOn(): Promise<"on" | "cancelled" | "noScreenLock" | "failed">;
  turnOff(): Promise<"off" | "cancelled" | "failed">;
  /** Sign-out, session end and deletion: removes the flag, with no prompt. */
  clear(): Promise<void>;
}

export function createAppLock(deps: AppLockDeps): AppLock {
  let phase: AppLockPhase = "checking";
  let leftAt: number | null = null;
  let prompting = 0;
  let captureBlocked = false;
  const listeners = new Set<(phase: AppLockPhase) => void>();
  const options = { keychainAccessible: deps.accessible };

  function set(next: AppLockPhase) {
    if (next === phase) return;
    phase = next;
    guardScreenCapture(next !== "off" && next !== "checking");
    for (const listener of listeners) listener(phase);
  }

  /** Blocks or allows screen capture when that changes. A refused native call is let go. */
  function guardScreenCapture(block: boolean) {
    const guard = deps.screenCapture;
    if (!guard || block === captureBlocked) return;
    captureBlocked = block;
    void (block ? guard.prevent() : guard.allow()).catch(() => undefined);
  }

  async function hasScreenLock(): Promise<boolean> {
    return (await deps.auth.getEnrolledLevelAsync()) !== SECURITY_LEVEL_NONE;
  }

  /** Asks the phone. A thrown prompt (a system cancel) is a no. */
  async function confirm(promptMessage: string): Promise<boolean> {
    prompting += 1;
    try {
      // The passcode stays allowed, so a phone without biometrics can still confirm.
      const result = await deps.auth.authenticateAsync({
        promptMessage,
        disableDeviceFallback: false,
      });
      return result.success === true;
    } catch {
      return false;
    } finally {
      prompting -= 1;
    }
  }

  async function start() {
    if (phase !== "checking") return;
    let flag: string | null;
    try {
      flag = await deps.store.getItemAsync(DEVICE_LOCK_KEY, options);
    } catch {
      // Fail closed: Unlock or Sign out will sort it out.
      return set("locked");
    }
    if (flag !== FLAG_ON) return set("off");
    try {
      set((await hasScreenLock()) ? "locked" : "noScreenLock");
    } catch {
      set("locked");
    }
  }

  function appStateChanged(next: AppStateLike) {
    if (next === "background") {
      if (phase === "unlocked" && !deps.isExempt() && prompting === 0) leftAt = deps.now();
      return;
    }
    if (next !== "active") return;
    const awayFrom = leftAt;
    leftAt = null;
    if (phase === "unlocked" && awayFrom !== null && deps.now() - awayFrom >= LOCK_AFTER_MS) {
      set("locked");
    }
  }

  async function unlock() {
    if (phase !== "locked") return;
    let available: boolean;
    try {
      available = await hasScreenLock();
    } catch {
      return;
    }
    if (!available) return set("noScreenLock");
    if (await confirm(deps.prompts.unlock)) set("unlocked");
  }

  async function availability(): Promise<"available" | "noScreenLock"> {
    try {
      return (await hasScreenLock()) ? "available" : "noScreenLock";
    } catch {
      return "noScreenLock";
    }
  }

  async function turnOn() {
    if ((await availability()) === "noScreenLock") return "noScreenLock" as const;
    if (!(await confirm(deps.prompts.turnOn))) return "cancelled" as const;
    try {
      await deps.store.setItemAsync(DEVICE_LOCK_KEY, FLAG_ON, options);
    } catch {
      return "failed" as const;
    }
    leftAt = null;
    set("unlocked");
    return "on" as const;
  }

  async function turnOff() {
    if (!(await confirm(deps.prompts.turnOff))) return "cancelled" as const;
    if (!(await removeFlag())) return "failed" as const;
    leftAt = null;
    set("off");
    return "off" as const;
  }

  /** Deletes the flag; if that fails, empties it, which reads as off. */
  async function removeFlag(): Promise<boolean> {
    try {
      await deps.store.deleteItemAsync(DEVICE_LOCK_KEY, options);
      return true;
    } catch {
      try {
        await deps.store.setItemAsync(DEVICE_LOCK_KEY, "", options);
        return true;
      } catch {
        return false;
      }
    }
  }

  async function clear() {
    leftAt = null;
    set("off");
    await removeFlag();
  }

  return {
    getPhase: () => phase,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    start,
    appStateChanged,
    isExempt: () => prompting > 0 || deps.isExempt(),
    unlock,
    availability,
    turnOn,
    turnOff,
    clear,
  };
}
