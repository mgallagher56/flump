/**
 * Sentry-free reporting seam. The exception filter and the module import only this file, so
 * `@sentry/node` is not even loaded without a DSN: `sentry.ts` (the only file that imports the SDK)
 * registers a reporter here when `initSentry` runs.
 */
interface Reporter {
  capture(error: unknown, requestId?: string): void;
  close(timeoutMs: number): Promise<unknown>;
}

let reporter: Reporter | undefined;

export function registerReporter(next: Reporter | undefined): void {
  reporter = next;
}

/** Reports an exception if Sentry is initialised; a no-op otherwise. */
export function reportException(error: unknown, requestId?: string): void {
  reporter?.capture(error, requestId);
}

/** Flushes and closes Sentry if it is initialised. */
export async function closeReporter(timeoutMs = 2000): Promise<void> {
  await reporter?.close(timeoutMs);
}
