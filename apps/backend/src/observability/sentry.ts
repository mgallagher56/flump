import { scrubBreadcrumb, scrubEvent } from "@flump/observability";
import * as Sentry from "@sentry/node";

type Env = Record<string, string | undefined>;

/**
 * Only integrations that cannot read request bodies, headers, variables or outbound traffic.
 * Http, NodeFetch, Console, RequestData, LocalVariables and the framework integrations are dropped.
 * `EventFilters` is the v11 name of InboundFilters.
 */
const ALLOWED_INTEGRATIONS = new Set([
  "EventFilters",
  "InboundFilters",
  "FunctionToString",
  "LinkedErrors",
  "Dedupe",
  "OnUncaughtException",
  "OnUnhandledRejection",
  "ContextLines",
]);

export const SELFTEST_MESSAGE = "sentry self-test";

/** Initialises Sentry. Returns false (and does nothing) without a DSN. */
export function initSentry(env: Env): boolean {
  const dsn = env.SENTRY_DSN?.trim();
  if (!dsn) return false;

  Sentry.init({
    dsn,
    environment: env.SENTRY_ENVIRONMENT || env.RAILWAY_ENVIRONMENT_NAME || "unknown",
    release: env.RAILWAY_GIT_COMMIT_SHA ? env.RAILWAY_GIT_COMMIT_SHA.slice(0, 7) : undefined,
    serverName: "backend",
    sendDefaultPii: false,
    tracesSampleRate: 0,
    beforeSendTransaction: () => null,
    includeLocalVariables: false,
    attachStacktrace: false,
    maxBreadcrumbs: 30,
    skipOpenTelemetrySetup: true,
    defaultIntegrations: false,
    integrations: Sentry.getDefaultIntegrations({}).filter((i) => ALLOWED_INTEGRATIONS.has(i.name)),
    beforeSend: scrubEvent as never,
    beforeBreadcrumb: scrubBreadcrumb as never,
  });

  if (env.SENTRY_SELFTEST_ON_BOOT === "1") Sentry.captureMessage(SELFTEST_MESSAGE);
  return true;
}

/** Single entry point for reporting an exception; any other catch-all filter must use this. */
export function reportException(error: unknown, requestId?: string): void {
  Sentry.captureException(error, requestId ? { tags: { request_id: requestId } } : undefined);
}
