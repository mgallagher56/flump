/**
 * What the device keeps besides the refresh token, tidied at the right moments (E12 S9, decided by
 * the coordinator on 27 November 2026):
 * - on launch: the iOS reinstall wipe, then the temporary export folder is swept, in case the app
 *   was stopped while a share sheet was open;
 * - on sign-out, session end and deletion: the app lock flag goes and the export folder is swept;
 * - on both, since E12 S7, the phone's HTTP cache is emptied (`httpCacheSweep.ts`).
 * The theme choice is kept through all of them, as web's.
 */

export interface HousekeepingDeps {
  sweepExports(): Promise<void>;
  /** The phone's HTTP cache, which kept API answers before E12 S7 (`httpCacheSweep.ts`). */
  sweepHttpCache?(): Promise<void>;
  clearLock(): Promise<void>;
  /** iOS only: the Keychain wipe after a reinstall (`reinstall.ts`). */
  reinstallWipe?: () => Promise<void>;
}

async function quietly(step: (() => Promise<void>) | undefined) {
  try {
    await step?.();
  } catch {
    // Each step is best effort: what is left is swept on the next launch.
  }
}

export function createDeviceHousekeeping(deps: HousekeepingDeps) {
  return {
    async onLaunch() {
      await quietly(deps.reinstallWipe);
      await quietly(deps.sweepExports);
      await quietly(deps.sweepHttpCache);
    },
    async wipe() {
      await quietly(deps.clearLock);
      await quietly(deps.sweepExports);
      await quietly(deps.sweepHttpCache);
    },
  };
}

/**
 * Whether the system browser sheet is open (sign-in or a re-authentication): the app lock does not
 * count that time as time away, so the lock never appears over a sign-in.
 */
export function createBrowserActivity() {
  let open = 0;
  return {
    async track<T>(run: () => Promise<T>): Promise<T> {
      open += 1;
      try {
        return await run();
      } finally {
        open -= 1;
      }
    },
    isOpen: () => open > 0,
  };
}
