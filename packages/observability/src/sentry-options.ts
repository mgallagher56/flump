export interface SafeOptionsInput {
  sendDefaultPii?: unknown;
  tracesSampleRate?: unknown;
  tracesSampler?: unknown;
  profilesSampleRate?: unknown;
  profilesSampler?: unknown;
  profileSessionSampleRate?: unknown;
  profileLifecycle?: unknown;
  enableTracing?: unknown;
  replaysSessionSampleRate?: unknown;
  replaysOnErrorSampleRate?: unknown;
  includeLocalVariables?: unknown;
  integrations?: unknown;
  beforeSend?: unknown;
  beforeBreadcrumb?: unknown;
}

const FORBIDDEN_INTEGRATION = /tracing|replay|feedback|profil/i;

function isPositive(value: unknown): boolean {
  return value !== undefined && value !== null && Number(value) !== 0;
}

function integrationName(integration: unknown): string {
  if (typeof integration === "string") return integration;
  if (typeof integration === "object" && integration !== null) {
    return String((integration as { name?: unknown }).name);
  }
  return "";
}

function fail(reason: string): never {
  throw new Error(`Unsafe Sentry options: ${reason}`);
}

/** Throws if Sentry options could leak PII. Used by the Sentry init tests. */
export function assertSafeOptions(opts: SafeOptionsInput): void {
  if (opts.sendDefaultPii !== false) fail("sendDefaultPii must be false");
  if (isPositive(opts.tracesSampleRate) || opts.tracesSampler !== undefined || opts.enableTracing) {
    fail("tracing must be disabled");
  }
  if (
    isPositive(opts.profilesSampleRate) ||
    opts.profilesSampler !== undefined ||
    isPositive(opts.profileSessionSampleRate) ||
    opts.profileLifecycle !== undefined
  ) {
    fail("profiling must be disabled");
  }
  if (isPositive(opts.replaysSessionSampleRate) || isPositive(opts.replaysOnErrorSampleRate)) {
    fail("session replay must be disabled");
  }
  if (opts.integrations !== undefined) {
    if (!Array.isArray(opts.integrations)) fail("integrations must be an array");
    if (opts.integrations.some((i) => FORBIDDEN_INTEGRATION.test(integrationName(i)))) {
      fail("tracing, replay, feedback and profiling integrations are forbidden");
    }
  }
  if (opts.includeLocalVariables) fail("includeLocalVariables must be off");
  if (typeof opts.beforeSend !== "function") fail("beforeSend must be a function");
  if (typeof opts.beforeBreadcrumb !== "function") fail("beforeBreadcrumb must be a function");
}
