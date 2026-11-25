/**
 * The app's one TanStack Query client (plan section 4.5): server state for every screen. A read is
 * retried twice, and only when the failure may pass on its own (`unavailable`: no network or a
 * timeout; `server`: a 5xx). A 401 is handled inside `@flump/api-client` (one shared refresh), and
 * no other failure is worth repeating. Writes are never retried here: the check-in offers "Try
 * again" itself, so one tap is one request.
 */
import { BackendError } from "@flump/api-client";
import { QueryClient } from "@tanstack/react-query";

const RETRYABLE = new Set(["unavailable", "server"]);

/** At most two retries, for a failure that may pass. */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  return failureCount < 2 && error instanceof BackendError && RETRYABLE.has(error.kind);
}

/** 1 s, then 2 s: long enough for a blip to pass, short enough not to look stuck. */
export function retryDelay(attempt: number): number {
  return Math.min(1000 * 2 ** attempt, 4000);
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: shouldRetry,
        retryDelay,
        // Saved data does not change under the person's feet while a screen is open; a screen that
        // writes invalidates what it changed.
        staleTime: 30_000,
      },
      mutations: { retry: false },
    },
  });
}
