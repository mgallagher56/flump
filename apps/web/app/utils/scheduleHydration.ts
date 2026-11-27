/**
 * Longest wait, in milliseconds, before the app hydrates when the browser reports no idle time.
 *
 * Hydration waits for an idle moment so the first paint is not delayed, but an idle callback with
 * no timeout can wait without limit on a busy main thread. In the E2E smoke run of 26 November
 * 2026 a settings page stayed unhydrated for 30 seconds: no buttons worked and the AI connections
 * card never asked for its tokens. With this bound the browser runs hydration after a second at
 * the latest.
 */
export const HYDRATION_IDLE_TIMEOUT_MS = 1000;

interface HydrationWindow {
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
  setTimeout: (callback: () => void, ms: number) => unknown;
}

/** Runs `hydrate` at the next idle moment, or after HYDRATION_IDLE_TIMEOUT_MS at the latest. */
export function scheduleHydration(win: HydrationWindow, hydrate: () => void): void {
  if (win.requestIdleCallback) {
    win.requestIdleCallback(hydrate, { timeout: HYDRATION_IDLE_TIMEOUT_MS });
  } else {
    // Safari has no requestIdleCallback: https://caniuse.com/requestidlecallback
    win.setTimeout(hydrate, 1);
  }
}
