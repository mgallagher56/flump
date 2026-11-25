/**
 * The native modules sign-in needs. They are part of a Flump build, but a host app such as Expo Go
 * may not carry them all, and loading one that is missing throws at import time, which took the
 * whole app down (the owner's Expo Go run, 25 November 2026: "Cannot find native module
 * 'ExpoCrypto'"). The app checks first and, if any is missing, says so instead of signing in.
 */
import { requireOptionalNativeModule } from "expo";

export const SIGN_IN_NATIVE_MODULES = ["ExpoCrypto", "ExpoSecureStore", "ExpoWebBrowser"] as const;

type Probe = (name: string) => unknown;

/** The modules this app binary does not carry. The probe is injected so tests need no phone. */
export function missingNativeModules(
  probe: Probe = (name) => requireOptionalNativeModule(name),
): string[] {
  return SIGN_IN_NATIVE_MODULES.filter((name) => !probe(name));
}

/** Thrown where sign-in code is asked to run in an app binary that lacks its native modules. */
export class MissingNativeModulesError extends Error {
  override readonly name = "MissingNativeModulesError";
  constructor(readonly missing: readonly string[]) {
    super(`Not in this app binary: ${missing.join(", ")}`);
  }
}
