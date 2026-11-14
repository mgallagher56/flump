import { PRIVATE_DATA_COLLECTION, scrubBreadcrumb, scrubEvent } from "@flump/observability";
import * as Sentry from "@sentry/node";
import { registerReporter } from "./report";
import { isSafeRequestId } from "./request-context";

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

const SELFTEST_MESSAGE = "sentry self-test";
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

/** D7: a 2% trace sample in production, none elsewhere (and so none in test) unless overridden. */
export const PRODUCTION_TRACES_SAMPLE_RATE = 0.02;

/** `SENTRY_TRACES_SAMPLE_RATE` (0 to 1) wins; otherwise 0.02 in production and 0 elsewhere. */
export function resolveTracesSampleRate(env: Env): number {
  const raw = env.SENTRY_TRACES_SAMPLE_RATE?.trim();
  if (raw) {
    const rate = Number(raw);
    if (Number.isFinite(rate) && rate >= 0 && rate <= 1) return rate;
  }
  return env.NODE_ENV?.trim() === "production" ? PRODUCTION_TRACES_SAMPLE_RATE : 0;
}

/** `METHOD /route/:template` as the request-context middleware names a request span. */
const TRANSACTION_NAME = /^[A-Z]{3,10} (?:unmatched|(?:\/[\w:.*{}-]{0,31}){1,20})$/;
const TRACE_KEYS = ["trace_id", "span_id", "parent_span_id", "op", "status", "origin"] as const;
const TRANSACTION_KEYS = [
  "type",
  "event_id",
  "timestamp",
  "start_timestamp",
  "platform",
  "environment",
  "release",
  "server_name",
  "sdk",
] as const;

function pick(source: Json, keys: readonly string[]): Json {
  const out: Json = {};
  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && (typeof value !== "object" || key === "sdk")) out[key] = value;
  }
  return out;
}

/**
 * beforeSendTransaction: rebuilds the transaction from an allow-list (M15, D7). Kept: ids, timing,
 * op and status, the route-template name, the HTTP status code and the request id tag. Everything
 * else is dropped, including `request` (URL, query string, headers, cookies, body), `user`,
 * `extra`, breadcrumbs, measurements and child spans (which could carry SQL or URLs).
 */
export function scrubTransaction(event: Json): Json | null {
  if (event.type !== "transaction") return null;
  const contexts = isObject(event.contexts) ? event.contexts : {};
  const trace = isObject(contexts.trace) ? contexts.trace : {};
  const traceData = isObject(trace.data) ? trace.data : {};
  const status = traceData["http.response.status_code"];
  const tags = isObject(event.tags) ? event.tags : {};
  return {
    ...pick(event, TRANSACTION_KEYS),
    transaction:
      typeof event.transaction === "string" && TRANSACTION_NAME.test(event.transaction)
        ? event.transaction
        : "unmatched",
    contexts: {
      trace: {
        ...pick(trace, TRACE_KEYS),
        ...(Number.isInteger(status) ? { data: { "http.response.status_code": status } } : {}),
      },
    },
    ...(isSafeRequestId(tags.request_id) ? { tags: { request_id: tags.request_id } } : {}),
    spans: [],
  };
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
    // Only request spans opened by the request-context middleware exist (no auto-instrumentation).
    tracesSampleRate: resolveTracesSampleRate(env),
    // v11 defaults to 'stream', which ignores beforeSendTransaction; 'static' keeps that backstop live.
    traceLifecycle: "static",
    beforeSendTransaction: scrubTransaction as never,
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
    // One isolation scope per request, tagged with its id, so any event captured while serving it
    // carries the tag; the server span is non-recording unless the trace sample picks it.
    runRequest: (requestId, run) =>
      Sentry.withIsolationScope((scope) => {
        scope.setTag("request_id", requestId);
        Sentry.startSpanManual(
          { name: "request", op: "http.server", forceTransaction: true },
          (span) =>
            run({
              finish: (name, status) => {
                span.updateName(name);
                Sentry.setHttpStatus(span, status);
                span.end();
              },
            }),
        );
      }),
  });

  if (env.SENTRY_SELFTEST_ON_BOOT === "1") Sentry.captureMessage(SELFTEST_MESSAGE);
  return true;
}
