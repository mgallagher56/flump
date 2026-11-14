/**
 * Sentry-free reporting seam. The exception filter and the module import only this file, so
 * `@sentry/node` is not even loaded without a DSN: `sentry.ts` (the only file that imports the SDK)
 * registers a reporter here when `initSentry` runs.
 */

/** One request as Sentry sees it: tagged scope plus, when sampled, a server span. */
export interface RequestScope {
  /** Ends the request span with the route template (never the URL) and status. */
  finish(name: string, status: number): void;
}

interface Reporter {
  capture(error: unknown, requestId?: string): void;
  close(timeoutMs: number): Promise<unknown>;
  /** Runs one request inside its own Sentry scope tagged with the request id. */
  runRequest?(requestId: string, run: (scope: RequestScope) => void): void;
}

const NOOP_SCOPE: RequestScope = { finish: () => undefined };

let reporter: Reporter | undefined;

export function registerReporter(next: Reporter | undefined): void {
  reporter = next;
}

/** Reports an exception if Sentry is initialised; a no-op otherwise. */
export function reportException(error: unknown, requestId?: string): void {
  reporter?.capture(error, requestId);
}

/** Runs `run` inside a request scope when Sentry is initialised; directly otherwise. */
export function runInRequestScope(requestId: string, run: (scope: RequestScope) => void): void {
  if (reporter?.runRequest) {
    reporter.runRequest(requestId, run);
  } else {
    run(NOOP_SCOPE);
  }
}

/** Flushes and closes Sentry if it is initialised. */
export async function closeReporter(timeoutMs = 2000): Promise<void> {
  await reporter?.close(timeoutMs);
}
