import { existsSync } from "node:fs";

/**
 * The instant the visual suite pretends it is: mid-month and mid-tax-year, so month labels,
 * check-in prompts and chart axes never move under the baselines. UTC.
 */
export const FROZEN_NOW = "2026-11-14T12:00:00Z";

// The multithreaded build: Bun runs JavaScript and I/O on several threads.
const LIBFAKETIME = [
  "/usr/lib/x86_64-linux-gnu/faketime/libfaketimeMT.so.1",
  "/usr/lib/aarch64-linux-gnu/faketime/libfaketimeMT.so.1",
].find((path) => existsSync(path));

/**
 * True when the servers run under libfaketime (Linux with the `faketime` package, as in the
 * visual CI job). Elsewhere the servers keep the real clock, and the browser must too, or the
 * client would hydrate different dates from the server's markup.
 */
export const SERVER_CLOCK_FROZEN = Boolean(LIBFAKETIME) && process.env.E2E_FREEZE_CLOCK === "1";

/**
 * Environment that starts a server's clock at FROZEN_NOW (it keeps ticking from there, so
 * timers work). Empty when the clock is not frozen.
 */
export function frozenClockEnv(): Record<string, string> {
  if (!SERVER_CLOCK_FROZEN || !LIBFAKETIME) return {};
  const at = FROZEN_NOW.replace("T", " ").replace("Z", "");
  return {
    LD_PRELOAD: LIBFAKETIME,
    FAKETIME: `@${at}`,
    // UTC like the deployed servers. FROZEN_NOW is midday in winter, so UTC and the browser's
    // Europe/London agree on the date; keep it away from midnight and British Summer Time.
    TZ: "UTC",
    // Monotonic clocks stay real, so timeouts and performance timers behave normally.
    FAKETIME_DONT_FAKE_MONOTONIC: "1",
    // File timestamps stay real, so build output and caches are not seen as from the future.
    NO_FAKE_STAT: "1",
  };
}
