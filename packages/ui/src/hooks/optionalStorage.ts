/**
 * Optional browser storage (E19 cookie and storage statement). Three sessionStorage keys only make
 * pages look or behave the same on a return view: the scroll position of each marketing page, which
 * illustrations have played, and the setup step count. PECR Schedule A1 paragraph 6 allows these
 * without consent only when the person is told about them and has a simple, free way to object.
 * This module is that way: one localStorage key records the objection (itself a recorded choice,
 * paragraph 4), and every optional key is read and written through `optionalSessionStorage()`.
 *
 * Storage is per origin, so the marketing site and the web app each hold their own choice.
 */
export const OPTIONAL_STORAGE_KEY = "flump-optional-storage";

/** The stored value that means "do not use optional storage". Absent means it is allowed. */
const OFF = "off";

/** Every optional sessionStorage key or key prefix. A new optional key is added here. */
export const OPTIONAL_SESSION_KEY_PREFIXES: readonly string[] = [
  "flump.scene-settled.",
  "flump.setup-step-count",
  "flump-marketing-scroll",
];

const EVENT = "flump:optional-storage";

/** True when the person has switched optional storage off in this browser, for this site. */
export function isOptionalStorageOff(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(OPTIONAL_STORAGE_KEY) === OFF;
  } catch {
    return false;
  }
}

function clearOptionalKeys(): void {
  try {
    const storage = window.sessionStorage;
    const doomed: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key && OPTIONAL_SESSION_KEY_PREFIXES.some((prefix) => key.startsWith(prefix))) {
        doomed.push(key);
      }
    }
    for (const key of doomed) storage.removeItem(key);
  } catch {
    // Storage blocked: there is nothing to clear.
  }
}

/**
 * Records the choice. Off stores the objection and removes every optional key already written; on
 * removes the objection, so nothing is stored about a person who never objected.
 */
export function setOptionalStorageOff(off: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (off) window.localStorage.setItem(OPTIONAL_STORAGE_KEY, OFF);
    else window.localStorage.removeItem(OPTIONAL_STORAGE_KEY);
  } catch {
    // Storage blocked: optional keys cannot be written either, so the objection already holds.
  }
  if (off) clearOptionalKeys();
  window.dispatchEvent(new Event(EVENT));
}

let watchingOtherTabs = false;

/**
 * sessionStorage is separate in each tab, so a tab that hears another tab switch optional storage
 * off removes its own optional keys. One listener a page, installed the first time optional
 * storage is used, so tabs that never show the switch clear too.
 */
function watchOtherTabs(): void {
  if (watchingOtherTabs || typeof window === "undefined") return;
  watchingOtherTabs = true;
  window.addEventListener("storage", (event) => {
    if (event.key === OPTIONAL_STORAGE_KEY && event.newValue === OFF) clearOptionalKeys();
  });
}

/** Calls `listener` when the choice changes in this tab or another one. Returns the unsubscribe. */
export function subscribeOptionalStorage(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === OPTIONAL_STORAGE_KEY) listener();
  };
  watchOtherTabs();
  window.addEventListener(EVENT, listener);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, listener);
    window.removeEventListener("storage", onStorage);
  };
}

/**
 * sessionStorage for an optional key, or null when the person objected or storage is unavailable.
 * Callers already cope with null (server rendering and private modes).
 */
export function optionalSessionStorage(): Storage | null {
  if (typeof window === "undefined" || typeof window.sessionStorage === "undefined") return null;
  watchOtherTabs();
  if (isOptionalStorageOff()) return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}
