import { redactDeep, redactString } from "./redact.js";

type Json = Record<string, unknown>;

export interface ScrubEvent {
  request?: Json & { url?: string; headers?: Record<string, unknown> };
  user?: unknown;
  server_name?: unknown;
  extra?: unknown;
  contexts?: unknown;
  tags?: unknown;
  message?: string;
  logentry?: { message?: string; formatted?: string; params?: unknown };
  exception?: { values?: Array<Json & { value?: string; stacktrace?: { frames?: Json[] } }> };
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

const stripQueryAndHash = (url: string): string => url.replace(/[?#].*$/s, "");
const toPath = (url: string): string =>
  stripQueryAndHash(url).replace(/^[a-z][a-z0-9+.-]*:\/\/[^/]*/i, "");

export function scrubEvent<T extends ScrubEvent>(event: T): T {
  const e = event as ScrubEvent;
  if (e.request) {
    const { url, headers, method } = e.request;
    const ua = headers?.["user-agent"] ?? headers?.["User-Agent"];
    e.request = {
      ...(typeof url === "string" ? { url: stripQueryAndHash(url) } : {}),
      ...(typeof method === "string" ? { method } : {}),
      ...(typeof ua === "string" ? { headers: { "user-agent": ua } } : {}),
    };
  }
  delete e.user;
  delete e.server_name;
  delete e.extra;
  if (e.contexts !== undefined) e.contexts = redactDeep(e.contexts);
  if (e.tags !== undefined) e.tags = redactDeep(e.tags);
  if (typeof e.message === "string") e.message = redactString(e.message);
  if (e.logentry) {
    const { message, formatted } = e.logentry;
    e.logentry = {
      ...(typeof message === "string" ? { message: redactString(message) } : {}),
      ...(typeof formatted === "string" ? { formatted: redactString(formatted) } : {}),
    };
  }
  for (const ex of e.exception?.values ?? []) {
    if (typeof ex.value === "string") ex.value = redactString(ex.value);
    for (const frame of ex.stacktrace?.frames ?? []) delete frame.vars;
  }
  return event;
}

const NETWORK_CATEGORIES = new Set(["http", "fetch", "xhr", "navigation"]);

export function scrubBreadcrumb<T extends ScrubBreadcrumb>(crumb: T): T | null {
  const category = crumb.category ?? "";
  if (!NETWORK_CATEGORIES.has(category)) return null;
  const data = crumb.data ?? {};
  const kept: Json = {};
  for (const key of ["method", "status_code"]) {
    if (data[key] !== undefined) kept[key] = data[key];
  }
  for (const key of ["url", "from", "to"]) {
    const v = data[key];
    if (typeof v === "string") kept[key] = toPath(v);
  }
  const out: ScrubBreadcrumb = { category };
  if (crumb.type !== undefined) out.type = crumb.type;
  if (crumb.level !== undefined) out.level = crumb.level;
  if (crumb.timestamp !== undefined) out.timestamp = crumb.timestamp;
  out.data = kept;
  return out as T;
}
