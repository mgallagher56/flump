import { scrubBreadcrumb } from "@flump/observability";
import * as Sentry from "@sentry/react";
import { beforeSend } from "./withhold";

/**
 * Loaded only through a dynamic import from entry.client.tsx when `window.ENV.SENTRY_DSN` is set,
 * so no SDK code is downloaded without a DSN. No tracing, no replay, no feedback, no session
 * tracking, and no HttpContext (it would add the page URL and referrer to every event).
 */
const ALLOWED_INTEGRATIONS = new Set([
  "EventFilters",
  "InboundFilters",
  "FunctionToString",
  "BrowserApiErrors",
  "GlobalHandlers",
  "LinkedErrors",
  "Dedupe",
]);

export const DENY_URLS: RegExp[] = [
  /^chrome:\/\//i,
  /^chrome-extension:\/\//i,
  /^moz-extension:\/\//i,
  /^safari-(web-)?extension:\/\//i,
  /^edge-extension:\/\//i,
  /extensions\//i,
];

export interface ClientSentryEnv {
  SENTRY_DSN?: string;
  SENTRY_ENVIRONMENT?: string;
  SENTRY_RELEASE?: string;
}

/** Initialises Sentry in the browser. Returns false (and does nothing) without a DSN. */
export function init(env: ClientSentryEnv | undefined): boolean {
  const dsn = env?.SENTRY_DSN?.trim();
  if (!dsn) return false;

  Sentry.init({
    dsn,
    environment: env?.SENTRY_ENVIRONMENT || "unknown",
    release: env?.SENTRY_RELEASE || undefined,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    beforeSendTransaction: () => null,
    attachStacktrace: false,
    maxBreadcrumbs: 30,
    denyUrls: DENY_URLS,
    defaultIntegrations: false,
    integrations: [
      ...Sentry.getDefaultIntegrations({}).filter((i) => ALLOWED_INTEGRATIONS.has(i.name)),
      Sentry.breadcrumbsIntegration({
        console: false,
        dom: false,
        sentry: false,
        fetch: true,
        xhr: true,
        history: true,
      }),
    ],
    beforeSend: beforeSend as never,
    beforeBreadcrumb: scrubBreadcrumb as never,
  });
  return true;
}

/** Reports a route or render error caught by React Router's `onError`. */
export function captureClientError(error: unknown): void {
  Sentry.captureException(error);
}
