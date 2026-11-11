import { useCallback, useEffect, useRef, useState } from "react";

interface FetcherLike {
  state: "idle" | "submitting" | "loading";
  data?: unknown;
}

export type FetcherOutcomeStatus = "idle" | "pending" | "failed" | "succeeded";

const GENERIC_ERROR = "Something went wrong. Please try again.";

/**
 * Tracks the result of one fetcher submission so confirmed destructive actions can stay open
 * while they run and show the action's `{ success: false, error }` text when they fail.
 * Call `begin()` immediately before `fetcher.submit(...)`. A result that is the same object as
 * the one present at `begin()` is a stale answer from an earlier submission and is ignored.
 */
export function useFetcherOutcome(fetcher: FetcherLike, opts: { onSuccess?: () => void } = {}) {
  const [status, setStatus] = useState<FetcherOutcomeStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const baseline = useRef<unknown>(undefined);
  const onSuccessRef = useRef(opts.onSuccess);
  onSuccessRef.current = opts.onSuccess;

  const begin = useCallback(() => {
    baseline.current = fetcher.data;
    setError(null);
    setStatus("pending");
  }, [fetcher.data]);

  const dismiss = useCallback(() => {
    setError(null);
    setStatus("idle");
  }, []);

  useEffect(() => {
    if (status !== "pending" || fetcher.state !== "idle" || fetcher.data === baseline.current) {
      return;
    }
    const result = fetcher.data as { success?: boolean; error?: unknown } | undefined;
    if (result && result.success === false) {
      setError(typeof result.error === "string" && result.error ? result.error : GENERIC_ERROR);
      setStatus("failed");
      return;
    }
    setStatus("succeeded");
    onSuccessRef.current?.();
  }, [status, fetcher.state, fetcher.data]);

  return { status, error, pending: status === "pending", begin, dismiss };
}
