import { PRIVATE_DATA_COLLECTION, scrubBreadcrumb, scrubEvent } from "@flump/observability";
import * as Sentry from "@sentry/node";
import { registerReporter } from "./report";

export { reportException } from "./report";

type Env = Record<string, string | undefined>;

/**
 * Only integrations that cannot read request bodies, headers, variables or outbound traffic.
 * Http, NodeFetch, Console, RequestData, LocalVariables and the framework integrations are dropped.
 * `EventFilters` is the v11 name of v10 `InboundFilters` (which no longer exists).
 * The two process-level handlers are replaced below with explicit, crash-preserving options.
 */
const ALLOWED_INTEGRATIONS = new Set([
  "EventFilters",
  "FunctionToString",
  "LinkedErrors",
  "Dedupe",
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
    // v11 removed `sendDefaultPii`; `dataCollection` replaces it (see `@sentry/core` 11.11.0 `datacollection.d.ts` and `resolveDataCollectionOptions`).
    // Every v11 default is ON, so every category is switched off explicitly:
    // user/IP, cookies, headers, bodies, query strings, local variables, DB and queue data, AI/GraphQL/MCP content.
    dataCollection: PRIVATE_DATA_COLLECTION,
    tracesSampleRate: 0,
    // v11 defaults to 'stream', which ignores beforeSendTransaction; 'static' keeps that backstop live.
    traceLifecycle: "static",
    beforeSendTransaction: () => null,
    includeLocalVariables: false,
    attachStacktrace: false,
    maxBreadcrumbs: 30,
    // v11: `skipOpenTelemetrySetup` is gone; no tracer provider is the default, kept explicit.
    enableOpenTelemetrySetup: false,
    // v11 default is ON: it registers module-loader hooks that rewrite application modules so that
    // instrumentation channels fire. Nothing here uses them, so no code transformation at load time.
    enableRuntimeChannelInjection: false,
    // SENTRY_SPOTLIGHT in the environment would otherwise enable the Spotlight sidecar integration.
    spotlight: false,
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
