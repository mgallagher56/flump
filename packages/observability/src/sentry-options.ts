export interface SafeOptionsInput {
  sendDefaultPii?: unknown;
  tracesSampleRate?: unknown;
  replaysSessionSampleRate?: unknown;
  replaysOnErrorSampleRate?: unknown;
  includeLocalVariables?: unknown;
  integrations?: unknown;
}

function isPositive(value: unknown): boolean {
  return value !== undefined && value !== null && Number(value) !== 0;
}

function hasReplayIntegration(integrations: unknown): boolean {
  return (
    Array.isArray(integrations) &&
    integrations.some(
      (i) =>
        typeof i === "object" &&
        i !== null &&
        /replay/i.test(String((i as { name?: unknown }).name)),
    )
  );
}

/** Throws if Sentry options could leak PII. Used by the Sentry init tests. */
export function assertSafeOptions(opts: SafeOptionsInput): void {
  if (opts.sendDefaultPii !== false) {
    throw new Error("Unsafe Sentry options: sendDefaultPii must be false");
  }
  if (isPositive(opts.tracesSampleRate)) {
    throw new Error("Unsafe Sentry options: tracesSampleRate must be 0 or unset");
  }
  if (
    isPositive(opts.replaysSessionSampleRate) ||
    isPositive(opts.replaysOnErrorSampleRate) ||
    hasReplayIntegration(opts.integrations)
  ) {
    throw new Error("Unsafe Sentry options: session replay must be disabled");
  }
  if (opts.includeLocalVariables) {
    throw new Error("Unsafe Sentry options: includeLocalVariables must be off");
  }
}
