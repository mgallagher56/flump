import { clearOnboardingSeed } from "@flump/finance-engine";
import {
  FINANCIAL_BASELINE_STORAGE_KEY,
  LEGACY_BASELINE_STORAGE_KEYS,
} from "~/state/baseline.store";
import { RUNWAY_STORAGE_KEY } from "~/utils/runwayStorage";

/** Per-user browser keys. The theme (THEME_STORAGE_KEY in @repo/ui) is a device preference and stays. */
export const USER_STORAGE_KEYS = [
  FINANCIAL_BASELINE_STORAGE_KEY,
  ...LEGACY_BASELINE_STORAGE_KEYS,
  RUNWAY_STORAGE_KEY,
  "flump_setup_checklist_dismissed",
] as const;

/** Removes everything the app keeps in this browser about the signed-in user (E19 A6). */
export function clearUserStorage(): void {
  if (typeof window === "undefined") return;
  for (const key of USER_STORAGE_KEYS) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Storage blocked: nothing to clear.
    }
  }
  clearOnboardingSeed();
}

/**
 * Clears user storage when any form posts to /logout, so every sign-out entry point is covered
 * without each one calling it. Returns the cleanup function.
 */
export function watchLogoutForms(doc: Document = document): () => void {
  const onSubmit = (event: Event) => {
    const form = event.target as HTMLFormElement | null;
    const action = form?.getAttribute?.("action");
    if (action && new URL(action, doc.baseURI).pathname === "/logout") clearUserStorage();
  };
  doc.addEventListener("submit", onSubmit, true);
  return () => doc.removeEventListener("submit", onSubmit, true);
}
