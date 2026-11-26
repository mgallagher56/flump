/**
 * The iOS Keychain wipe after a reinstall (E12 S2b; spike notes, "Follow-up for S2b or S18"). A
 * Keychain item survives an uninstall, so a reinstalled app would find the old refresh token and
 * sign straight back in. The app's preferences (NSUserDefaults, through React Native's `Settings`)
 * are removed with the app, so a marker kept there tells a first launch from a later one: with no
 * marker, the secure store is cleared first, and the marker is set only once that worked.
 *
 * Android needs none of this: uninstalling removes the app's Keystore-encrypted storage.
 */
import type { TokenStore } from "./tokenStore";

export const INSTALL_MARKER_KEY = "flump.installed";

/** React Native's iOS `Settings`, or a stand-in in tests. */
export interface PreferencesLike {
  get(key: string): unknown;
  set(values: Record<string, unknown>): void;
}

/**
 * Clears the secure store on the first launch of this installation. Never throws: a failure leaves
 * the marker unset, so the next launch tries again, and the session carries on as before.
 */
export async function wipeAfterReinstall(
  preferences: PreferencesLike,
  tokens: Pick<TokenStore, "clear">,
): Promise<void> {
  try {
    if (preferences.get(INSTALL_MARKER_KEY) === true) return;
    if (!(await tokens.clear())) return;
    preferences.set({ [INSTALL_MARKER_KEY]: true });
  } catch {
    // Preferences unreadable: change nothing.
  }
}
