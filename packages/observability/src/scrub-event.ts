import { isSensitiveKey, REDACTED, redactString } from "./redact.js";

type Json = Record<string, unknown>;

export interface ScrubEvent {
  request?: Json & { url?: string; headers?: Record<string, unknown> };
  contexts?: unknown;
  tags?: unknown;
  message?: string;
  transaction?: string;
  logentry?: { message?: string; formatted?: string; params?: unknown };
  exception?: { values?: unknown };
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

const MAX_URL = 2048;
const CONTEXT_ALLOW = new Set(["os", "browser", "runtime", "device", "app", "culture", "trace"]);
// name/version of these contexts describe software, not people.
const SOFTWARE_CONTEXTS = new Set(["os", "browser", "runtime"]);
const SOFTWARE_KEYS = new Set(["name", "version"]);

const isObject = (v: unknown): v is Json => typeof v === "object" && v !== null;
const str = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);

function set(out: Json, key: string, value: unknown): void {
  if (value !== undefined) out[key] = value;
}

function stripQueryAndHash(url: string): string {
  return url.slice(0, MAX_URL).replace(/[?#].*$/s, "");
}

const ORIGIN = /^[a-z][a-z0-9+.-]*:\/\/[^/]*/i;

/** Redacts each path segment on its own, so long but harmless paths keep their shape. */
function redactPath(path: string): string {
  return path
    .split(/([\\/])/)
    .map((part) => redactString(part))
    .join("");
}

/** Full URL with userinfo, query and hash removed and path segments redacted. */
function cleanUrl(url: string): string {
  const bare = stripQueryAndHash(url);
  const origin = ORIGIN.exec(bare)?.[0];
  if (origin === undefined) return redactPath(bare);
  const host = origin.replace(/^([a-z][a-z0-9+.-]*:\/\/)(?:[^@]*@)?/i, "$1");
  return host + redactPath(bare.slice(origin.length));
}

/** Path only: origin (and so userinfo), query and hash removed, then redacted. */
function cleanPath(url: string): string {
  return redactPath(stripQueryAndHash(url).replace(ORIGIN, ""));
}

/** Repo-relative tail of a file path: no home directories, no absolute prefixes. */
function cleanFilename(file: string): string {
  const tail = file
    .slice(0, MAX_URL)
    .replace(/^file:\/\//i, "")
    .replace(/^.*[\\/](node_modules[\\/])/s, "$1")
    .replace(/^.*?(?:[\\/]Users[\\/][^\\/]+[\\/]|[\\/]home[\\/][^\\/]+[\\/])/s, "");
  return redactPath(tail);
}

function scrubRequest(request: Json): Json {
  const out: Json = {};
  const url = str(request.url);
  if (url !== undefined) out.url = cleanUrl(url);
  set(out, "method", str(request.method));
  const headers = request.headers;
  const ua = isObject(headers) ? str(headers["user-agent"] ?? headers["User-Agent"]) : undefined;
  if (ua !== undefined) out.headers = { "user-agent": redactString(ua) };
  return out;
}

function scrubContexts(contexts: unknown): Json | undefined {
  if (!isObject(contexts)) return undefined;
  const out: Json = {};
  for (const [name, ctx] of Object.entries(contexts)) {
    if (!CONTEXT_ALLOW.has(name) || !isObject(ctx)) continue;
    const clean: Json = {};
    for (const [key, value] of Object.entries(ctx)) {
      if (typeof value !== "string") continue;
      const safeKey = SOFTWARE_CONTEXTS.has(name) && SOFTWARE_KEYS.has(key);
      clean[key] = !safeKey && isSensitiveKey(key) ? REDACTED : redactString(value);
    }
    out[name] = clean;
  }
  return out;
}

function scrubTags(tags: unknown): Json | undefined {
  if (!isObject(tags)) return undefined;
  const out: Json = {};
  for (const [key, value] of Object.entries(tags)) {
    if (typeof value !== "string") continue;
    out[key] = isSensitiveKey(key) ? REDACTED : redactString(value);
  }
  return out;
}

function scrubFrame(frame: Json): Json {
  const out: Json = {};
  const fn = str(frame.function);
  if (fn !== undefined) out.function = redactString(fn);
  const mod = str(frame.module);
  if (mod !== undefined) out.module = redactString(mod);
  const file = str(frame.filename) ?? str(frame.abs_path);
  if (file !== undefined) out.filename = cleanFilename(file);
  if (typeof frame.lineno === "number") out.lineno = frame.lineno;
  if (typeof frame.colno === "number") out.colno = frame.colno;
  if (typeof frame.in_app === "boolean") out.in_app = frame.in_app;
  return out;
}

function scrubMechanism(mechanism: Json): Json {
  const out: Json = {};
  set(out, "type", str(mechanism.type));
  if (typeof mechanism.handled === "boolean") out.handled = mechanism.handled;
  const description = str(mechanism.description);
  if (description !== undefined) out.description = redactString(description);
  return out;
}

function scrubException(ex: Json): Json {
  const out: Json = {};
  const type = str(ex.type);
  if (type !== undefined) out.type = redactString(type);
  const value = str(ex.value);
  if (value !== undefined) out.value = redactString(value);
  if (isObject(ex.mechanism)) out.mechanism = scrubMechanism(ex.mechanism);
  const frames = isObject(ex.stacktrace) ? ex.stacktrace.frames : undefined;
  if (Array.isArray(frames)) out.stacktrace = { frames: frames.filter(isObject).map(scrubFrame) };
  return out;
}

function scrubSdk(sdk: unknown): Json | undefined {
  if (!isObject(sdk)) return undefined;
  const out: Json = {};
  set(out, "name", str(sdk.name));
  set(out, "version", str(sdk.version));
  return out;
}

function scrubEventUnsafe(e: Json): Json {
  const out: Json = {};
  for (const key of ["event_id", "level", "platform", "release", "environment", "type"]) {
    set(out, key, str(e[key]));
  }
  if (typeof e.timestamp === "number" || typeof e.timestamp === "string") {
    out.timestamp = e.timestamp;
  }
  set(out, "sdk", scrubSdk(e.sdk));
  if (isObject(e.request)) out.request = scrubRequest(e.request);
  set(out, "contexts", scrubContexts(e.contexts));
  set(out, "tags", scrubTags(e.tags));
  const message = str(e.message);
  if (message !== undefined) out.message = redactString(message);
  const transaction = str(e.transaction);
  if (transaction !== undefined) out.transaction = redactString(transaction);
  if (isObject(e.logentry)) {
    const logentry: Json = {};
    const lm = str(e.logentry.message);
    const lf = str(e.logentry.formatted);
    if (lm !== undefined) logentry.message = redactString(lm);
    if (lf !== undefined) logentry.formatted = redactString(lf);
    out.logentry = logentry;
  }
  if (isObject(e.exception)) {
    const values = Array.isArray(e.exception.values) ? e.exception.values : [];
    out.exception = { values: values.filter(isObject).map(scrubException) };
  }
  if (Array.isArray(e.breadcrumbs)) {
    out.breadcrumbs = e.breadcrumbs
      .map((crumb) => (isObject(crumb) ? scrubBreadcrumbUnsafe(crumb) : null))
      .filter((crumb) => crumb !== null);
  }
  return out;
}

/**
 * Allow-list scrub, fail-closed: builds a new event from permitted, validated
 * fields only, and returns null (drop the event) if anything throws.
 */
export function scrubEvent<T extends ScrubEvent>(event: T): T | null {
  try {
    if (!isObject(event)) return null;
    return scrubEventUnsafe(event) as T;
  } catch {
    return null;
  }
}

const NETWORK_CATEGORIES = new Set(["http", "fetch", "xhr", "navigation"]);

function scrubBreadcrumbUnsafe(crumb: Json): Json | null {
  const category = str(crumb.category) ?? "";
  if (!NETWORK_CATEGORIES.has(category)) return null;
  const data = isObject(crumb.data) ? crumb.data : {};
  const kept: Json = {};
  const method = str(data.method);
  if (method !== undefined && /^[A-Z]+$/.test(method)) kept.method = method;
  const status = data.status_code;
  if (typeof status === "number" && Number.isFinite(status)) kept.status_code = status;
  for (const key of ["url", "from", "to"]) {
    const v = str(data[key]);
    if (v !== undefined) kept[key] = cleanPath(v);
  }
  const out: Json = { category };
  set(out, "type", str(crumb.type));
  set(out, "level", str(crumb.level));
  if (typeof crumb.timestamp === "number" && Number.isFinite(crumb.timestamp)) {
    out.timestamp = crumb.timestamp;
  }
  out.data = kept;
  return out;
}

export function scrubBreadcrumb<T extends ScrubBreadcrumb>(crumb: T): T | null {
  try {
    if (!isObject(crumb)) return null;
    return scrubBreadcrumbUnsafe(crumb) as T | null;
  } catch {
    return null;
  }
}
