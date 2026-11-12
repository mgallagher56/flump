import { redactDeep, redactString } from "./redact.js";

type Json = Record<string, unknown>;

interface ScrubException extends Json {
  value?: string;
  mechanism?: Json;
  stacktrace?: { frames?: Json[] };
}

export interface ScrubEvent {
  request?: Json & { url?: string; headers?: Record<string, unknown> };
  contexts?: unknown;
  tags?: unknown;
  message?: string;
  transaction?: string;
  logentry?: { message?: string; formatted?: string; params?: unknown };
  exception?: { values?: ScrubException[] };
  breadcrumbs?: unknown;
  [key: string]: unknown;
}

export interface ScrubBreadcrumb {
  category?: string;
  type?: string;
  level?: string;
  timestamp?: number;
  message?: string;
  data?: Json;
  [key: string]: unknown;
}

/** The only fields copied across untouched. Everything else is rebuilt or dropped. */
const PASSTHROUGH = [
  "event_id",
  "level",
  "platform",
  "timestamp",
  "release",
  "environment",
  "sdk",
  "type",
] as const;

const stripQueryAndHash = (url: string): string => url.replace(/[?#].*$/s, "");
const toPath = (url: string): string =>
  stripQueryAndHash(url).replace(/^[a-z][a-z0-9+.-]*:\/\/[^/]*/i, "");

function scrubRequest(request: NonNullable<ScrubEvent["request"]>): ScrubEvent["request"] {
  const { url, headers, method } = request;
  const ua = headers?.["user-agent"] ?? headers?.["User-Agent"];
  return {
    ...(typeof url === "string" ? { url: redactString(stripQueryAndHash(url)) } : {}),
    ...(typeof method === "string" ? { method } : {}),
    ...(typeof ua === "string" ? { headers: { "user-agent": ua } } : {}),
  };
}

function scrubException(ex: ScrubException): ScrubException {
  const out: ScrubException = { ...ex };
  if (typeof ex.value === "string") out.value = redactString(ex.value);
  if (ex.mechanism) {
    out.mechanism = { ...ex.mechanism };
    if (ex.mechanism.data !== undefined) out.mechanism.data = redactDeep(ex.mechanism.data);
  }
  if (ex.stacktrace?.frames) {
    out.stacktrace = {
      ...ex.stacktrace,
      frames: ex.stacktrace.frames.map((frame) => {
        const copy = { ...frame };
        delete copy.vars;
        return copy;
      }),
    };
  }
  return out;
}

/**
 * Allow-list scrub: builds a new event from permitted fields only, so any
 * field the SDK adds later (spans, threads, modules, ...) is dropped by default.
 */
export function scrubEvent<T extends ScrubEvent>(event: T): T {
  const e = event as ScrubEvent;
  const out: ScrubEvent = {};
  for (const key of PASSTHROUGH) {
    if (e[key] !== undefined) out[key] = e[key];
  }
  if (e.request) out.request = scrubRequest(e.request);
  if (e.contexts !== undefined) out.contexts = redactDeep(e.contexts);
  if (e.tags !== undefined) out.tags = redactDeep(e.tags);
  if (typeof e.message === "string") out.message = redactString(e.message);
  if (typeof e.transaction === "string") out.transaction = redactString(e.transaction);
  if (e.logentry) {
    const { message, formatted } = e.logentry;
    out.logentry = {
      ...(typeof message === "string" ? { message: redactString(message) } : {}),
      ...(typeof formatted === "string" ? { formatted: redactString(formatted) } : {}),
    };
  }
  if (e.exception) {
    out.exception = { values: (e.exception.values ?? []).map(scrubException) };
  }
  if (Array.isArray(e.breadcrumbs)) {
    out.breadcrumbs = e.breadcrumbs
      .map((crumb) =>
        typeof crumb === "object" && crumb !== null
          ? scrubBreadcrumb(crumb as ScrubBreadcrumb)
          : null,
      )
      .filter((crumb) => crumb !== null);
  }
  return out as T;
}

const NETWORK_CATEGORIES = new Set(["http", "fetch", "xhr", "navigation"]);

export function scrubBreadcrumb<T extends ScrubBreadcrumb>(crumb: T): T | null {
  const category = crumb.category ?? "";
  if (!NETWORK_CATEGORIES.has(category)) return null;
  const data = crumb.data ?? {};
  const kept: Json = {};
  const { method, status_code: status } = data;
  if (typeof method === "string" && /^[A-Z]+$/.test(method)) kept.method = method;
  if (typeof status === "number" && Number.isFinite(status)) kept.status_code = status;
  for (const key of ["url", "from", "to"]) {
    const v = data[key];
    if (typeof v === "string") kept[key] = redactString(toPath(v));
  }
  const out: ScrubBreadcrumb = { category };
  if (crumb.type !== undefined) out.type = crumb.type;
  if (crumb.level !== undefined) out.level = crumb.level;
  if (crumb.timestamp !== undefined) out.timestamp = crumb.timestamp;
  out.data = kept;
  return out as T;
}
