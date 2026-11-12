import { scrubBreadcrumb, scrubEvent } from "@flump/observability";
import * as Sentry from "@sentry/node";
import { registerReporter } from "./report";

export { reportException } from "./report";

type Env = Record<string, string | undefined>;

/**
 * Only integrations that cannot read request bodies, headers, variables or outbound traffic.
 * Http, NodeFetch, Console, RequestData, LocalVariables and the framework integrations are dropped.
 * `EventFilters` is the v11 name of InboundFilters.
 * The two process-level handlers are replaced below with explicit, crash-preserving options.
 */
const ALLOWED_INTEGRATIONS = new Set([
  "EventFilters",
  "InboundFilters",
  "FunctionToString",
  "LinkedErrors",
  "Dedupe",
  "ContextLines",
]);

export const SELFTEST_MESSAGE = "sentry self-test";
export const WITHHELD = "[message withheld]";

type Json = Record<string, unknown>;
const isObject = (v: unknown): v is Json => typeof v === "object" && v !== null;

/**
 * Backend error messages are never sent. Provider and database code builds messages from response
 * bodies and row data (for example `${await res.text()}` or QueryFailedError details), which the
 * pattern scrubber cannot reliably clean. Each exception keeps its `type` and scrubbed frames;
 * `value` (including linked causes, which are further entries of `exception.values`) and the event
 * `message` / `logentry` are replaced. Only the fixed self-test message passes through.
 */
export function withholdMessages(event: Json): Json {
  const exception = event.exception;
  if (isObject(exception) && Array.isArray(exception.values)) {
    exception.values = exception.values.map((v) =>
      isObject(v) && "value" in v ? { ...v, value: WITHHELD } : v,
    );
  }
  if (typeof event.message === "string" && event.message !== SELFTEST_MESSAGE) {
    event.message = WITHHELD;
  }
  const logentry = event.logentry;
  if (isObject(logentry)) {
    const text = logentry.formatted ?? logentry.message;
    event.logentry =
      text === SELFTEST_MESSAGE ? { message: SELFTEST_MESSAGE } : { message: WITHHELD };
  }
  return event;
}

/** beforeSend: withhold messages first, then run the shared scrubber over what is left. */
export function beforeSend(event: Json): Json | null {
  return (scrubEvent as unknown as (e: Json) => Json | null)(withholdMessages(event));
}

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
    integrations: [
      ...Sentry.getDefaultIntegrations({}).filter((i) => ALLOWED_INTEGRATIONS.has(i.name)),
      // The SDK's defaults (mode 'warn') would suppress Node's crash on an unhandled rejection.
      // 'strict' reports it and then lets Node crash as it would without Sentry.
      Sentry.onUncaughtExceptionIntegration({ exitEvenIfOtherHandlersAreRegistered: true }),
      Sentry.onUnhandledRejectionIntegration({ mode: "strict" }),
    ],
    beforeSend: beforeSend as never,
    beforeBreadcrumb: scrubBreadcrumb as never,
  });
  registerReporter({
    capture: (error, requestId) =>
      Sentry.captureException(error, requestId ? { tags: { request_id: requestId } } : undefined),
    close: (timeoutMs) => Sentry.close(timeoutMs),
  });

  if (env.SENTRY_SELFTEST_ON_BOOT === "1") Sentry.captureMessage(SELFTEST_MESSAGE);
  return true;
}
