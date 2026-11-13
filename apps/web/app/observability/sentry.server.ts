import { scrubBreadcrumb } from "@flump/observability";
import * as Sentry from "@sentry/node";
import { safeErrorSummary } from "../utils/safeErrorSummary";
import { sentryPublicEnv } from "./env";
import { beforeSend } from "./withhold";

type Env = Record<string, string | undefined>;

/**
 * Only integrations that cannot read request bodies, headers, variables or outbound traffic
 * (the same list as the backend). Http, NodeFetch, Console, RequestData and LocalVariables are
 * dropped; the two process-level handlers are added below with crash-preserving options.
 */
const ALLOWED_INTEGRATIONS = new Set([
  "EventFilters",
  "InboundFilters",
  "FunctionToString",
  "LinkedErrors",
  "Dedupe",
  "ContextLines",
]);

let initialised = false;
const reported = new WeakSet<object>();

/** Initialises Sentry. Returns false (and does nothing) without a DSN. */
export function initSentry(env: Env): boolean {
  const { SENTRY_DSN, SENTRY_ENVIRONMENT, SENTRY_RELEASE } = sentryPublicEnv(env);
  if (!SENTRY_DSN) return false;

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: SENTRY_ENVIRONMENT || "unknown",
    release: SENTRY_RELEASE || undefined,
    serverName: "web",
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
      // The SDK default (mode 'warn') would suppress Node's crash on an unhandled rejection.
      // 'strict' reports it and then lets Node crash as it would without Sentry.
      Sentry.onUncaughtExceptionIntegration({ exitEvenIfOtherHandlersAreRegistered: true }),
      Sentry.onUnhandledRejectionIntegration({ mode: "strict" }),
    ],
    beforeSend: beforeSend as never,
    beforeBreadcrumb: scrubBreadcrumb as never,
  });
  initialised = true;
  return true;
}

/**
 * Reports a server error from React Router's `handleError` or the render `onError`.
 * Aborted requests and thrown Responses below 500 (redirects, 401s, 404s) are control flow and
 * are ignored. Only the log-safe summary is written to the console; the SDK receives the error
 * when initialised.
 */
export function reportServerError(error: unknown, request: Request): void {
  if (request.signal?.aborted) return;
  if (error instanceof Response && error.status < 500) return;
  // The same error can reach both handleError and the render onError; report it once.
  if (typeof error === "object" && error !== null) {
    if (reported.has(error)) return;
    reported.add(error);
  }
  console.error(safeErrorSummary(error));
  if (!initialised) return;
  Sentry.captureException(
    error instanceof Response ? new Error(`Thrown Response ${error.status}`) : error,
  );
}

/** Waits for queued events to be sent (used by the Bun runtime check). */
export async function flushSentry(timeoutMs: number): Promise<boolean> {
  return Sentry.flush(timeoutMs);
}

initSentry(process.env);
