import { redactDeep, redactString } from "@flump/observability";
import { ConsoleLogger, type LogLevel } from "@nestjs/common";
import { currentRequestId, isSafeRequestId } from "./request-context";

const METHOD = /^[A-Z]{3,10}$/;
/** A route template: `/`-prefixed, up to 20 segments of at most 31 characters (no token-length runs). */
const ROUTE = /^(?:\/[\w:.*{}-]{0,31}){1,20}$/;
const ACCESS_LOG_REQUIRED = ["requestId", "method", "route", "status", "durationMs"] as const;
/** Printed instead of anything the scrubber could not process. Raw input is never the fallback. */
const SCRUB_FAILED = "[log scrubbing failed]";
/** A Nest context is a class name. Anything else was passed as a trailing string by mistake. */
const CONTEXT = /^[A-Za-z][\w.$-]{0,63}$/;
const ERROR_NAME = /^[A-Za-z][\w$.]{0,99}$/;
const ERROR_CODE = /^[A-Za-z0-9_]{1,40}$/;
const ERROR_SEVERITY = /^[A-Z]{3,10}$/;
const HOME_DIR = /(?:\/users|\/home)\/[^/\s)]{1,64}|[a-z]:\\users\\[^\\\s)]{1,64}/gi;
/**
 * The only shapes a stack frame line may have: `at [async] [new] name [[as alias]] (location)` or
 * `at [async] location`, with no free text. A location is required.
 */
const AT_LINE = /^\s{0,16}at\s/;
const FRAME_NAMED =
  /^\s{0,16}at (?:async )?(?:new )?([\w$.<>[\]]{1,200})(?: \[as ([\w$]{1,100})\])? \((index \d{1,5}|[^\s()]{1,400})\)$/;
const FRAME_BARE = /^\s{0,16}at (?:async )?([^\s()]{1,400})$/;
const FRAME_QUERY = /[?#][^\s()]*?(?=:\d{1,7}:\d{1,7}\)?$)/;
/** A real location: an absolute, home, file, node: or eval path, then `:line:column`. */
const LOCATION = /^(.{1,400}):(\d{1,7}):(\d{1,7})$/;
const LOCATION_ROOT = /^(?:\/|~|file:\/\/|node:|\[eval\]|[A-Za-z]:[\\/])/;
const SPECIAL_LOCATION = /^(?:native|<anonymous>|index \d{1,5})$/;
// biome-ignore lint/suspicious/noControlCharactersInRegex: the point is to neutralise them
const CONTROL = /[\u0000-\u0008\u000b-\u001f\u007f\u0085\u2028\u2029]/g;

const MAX_STACK_LENGTH = 16_384;
const MAX_STACK_LINES = 200;
const MAX_FRAME_LENGTH = 500;
const MAX_ERROR_DEPTH = 5;

function isAccessLogField(key: string, value: unknown): boolean {
  switch (key) {
    case "requestId":
      return isSafeRequestId(value);
    case "method":
      return typeof value === "string" && METHOD.test(value);
    case "route":
      return typeof value === "string" && (value === "unmatched" || ROUTE.test(value));
    case "status":
      return Number.isInteger(value) && (value as number) >= 0 && (value as number) <= 999;
    case "durationMs":
      return typeof value === "number" && Number.isFinite(value) && value >= 0 && value < 1e9;
    case "aborted":
      return value === true;
    default:
      return false;
  }
}

/**
 * True only for the exact object the access-log middleware writes (the five required keys plus an
 * optional `aborted`) with every field in its strict shape. The generic scrubber would blank a UUID
 * request id, a long route template and a float duration, but a pass-through for arbitrary objects
 * would print any word-like `route` or `method` verbatim, so the whole object has to match.
 */
function isAccessLogEntry(value: Record<string, unknown>): boolean {
  const keys = Object.keys(value);
  const allowed = keys.every(
    (k) => k === "aborted" || (ACCESS_LOG_REQUIRED as readonly string[]).includes(k),
  );
  return (
    allowed &&
    ACCESS_LOG_REQUIRED.every((k) => keys.includes(k)) &&
    keys.every((k) => isAccessLogField(k, value[k]))
  );
}

/**
 * Audit events (security review), each counts only, and the one id each may carry: the acting
 * user for a reset, the tombstone (never the user) for an account deletion (BE-04).
 */
const AUDIT_EVENTS: Readonly<Record<string, "userId" | "tombstoneId">> = {
  financial_data_reset: "userId",
  account_deleted: "tombstoneId",
};
/** A user id: a UUID, or a WorkOS user id (`user_` plus a 26-character ULID). */
const USER_ID =
  /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|user_[0-9A-Z]{26})$/i;
const TOMBSTONE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const COUNT_KEY = /^[A-Za-z]{1,40}$/;
const MAX_AUDIT_COUNTS = 16;

/**
 * True only for an exact audit event: `{ event, <id>, removed }` with a known event name, its id
 * key (`userId` in strict id shape, or `tombstoneId` as a UUID) and `removed` holding at most 16
 * whole, non-negative counts under plain word keys. The generic scrubber would blank the id (its
 * long-token rule matches any UUID), leaving an audit trail that does not say whose data it was.
 * Anything else, including one extra key, falls through to the generic scrubber.
 */
function isAuditEventEntry(value: Record<string, unknown>): boolean {
  if (typeof value.event !== "string" || !Object.hasOwn(AUDIT_EVENTS, value.event)) return false;
  const idKey = AUDIT_EVENTS[value.event];
  if (idKey === undefined) return false;
  const keys = Object.keys(value).sort();
  if (keys.join(",") !== ["event", "removed", idKey].sort().join(",")) return false;
  const id = value[idKey];
  if (typeof id !== "string" || !(idKey === "userId" ? USER_ID : TOMBSTONE_ID).test(id))
    return false;
  const removed = value.removed;
  if (!isPlainObject(removed)) return false;
  const entries = Object.entries(removed);
  return (
    entries.length <= MAX_AUDIT_COUNTS &&
    entries.every(
      ([k, n]) =>
        COUNT_KEY.test(k) && Number.isInteger(n) && (n as number) >= 0 && (n as number) < 1e9,
    )
  );
}

/** Own error fields that are safe to print as-is: SQLSTATEs, errno names, HTTP statuses. */
function isSafeErrorField(key: string, value: unknown): boolean {
  if (key === "code") return typeof value === "string" && ERROR_CODE.test(value);
  if (key === "statusCode" || key === "status" || key === "errno") {
    return Number.isInteger(value) && Math.abs(value as number) < 10_000;
  }
  return key === "severity" && typeof value === "string" && ERROR_SEVERITY.test(value);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/** Escapes line breaks and control characters (log forging, terminal escapes) as visible text. */
export function escapeControl(text: string): string {
  return text.replace(/\n/g, "\\n").replace(CONTROL, (c) => {
    if (c === "\r") return "\\r";
    const code = c.charCodeAt(0);
    return code > 0xff
      ? `\\u${code.toString(16).padStart(4, "0")}`
      : `\\x${code.toString(16).padStart(2, "0")}`;
  });
}

/** True if the text survives the full scrubber unchanged (no email, card, long digits, credential). */
function isClean(text: string): boolean {
  return redactString(text) === text;
}

function isTrustedLocation(location: string): boolean {
  if (SPECIAL_LOCATION.test(location)) return true;
  const match = LOCATION.exec(location);
  const path = match?.[1];
  if (path === undefined || !LOCATION_ROOT.test(path)) return false;
  return path.split(/[\\/]/).every(isClean);
}

/**
 * Returns the cleaned frame line, or null when it is not a trustworthy frame: it must have the strict
 * shape, a real location (not a bare word, email or token) and name and path tokens that the scrubber
 * leaves untouched.
 */
function trustedFrame(line: string): string | null {
  if (line.length > MAX_FRAME_LENGTH) return null;
  const clean = line.replace(FRAME_QUERY, "").replace(HOME_DIR, "~");
  const named = FRAME_NAMED.exec(clean);
  if (named) {
    const [, name, alias, location] = named;
    const ok =
      isClean(name ?? "") &&
      (alias === undefined || isClean(alias)) &&
      isTrustedLocation(location ?? "");
    return ok ? clean : null;
  }
  const bare = FRAME_BARE.exec(clean)?.[1];
  return bare !== undefined && isTrustedLocation(bare) ? clean : null;
}

/**
 * Rebuilds a stack. The message (every line that is not a frame) is fully redacted and joined onto
 * one line with escaped line breaks, so it cannot forge log lines. A line starting with `at ` is kept
 * only if it is a trusted frame (function, file and `line:column` survive; `?query`/`#hash` are
 * dropped and home-directory prefixes become `~`); otherwise it becomes `at [redacted]`.
 */
export function sanitizeStack(stack: string): string {
  const capped = stack.length > MAX_STACK_LENGTH ? stack.slice(0, MAX_STACK_LENGTH) : stack;
  const message: string[] = [];
  const frames: string[] = [];
  for (const line of capped.split("\n", MAX_STACK_LINES)) {
    if (AT_LINE.test(line)) {
      frames.push(escapeControl(trustedFrame(line) ?? "    at [redacted]"));
    } else {
      message.push(escapeControl(redactString(line)));
    }
  }
  return [message.join("\\n"), ...frames].join("\n");
}

function isError(value: unknown): value is Error {
  return value instanceof Error;
}

/** A copy of the error whose message, stack, own primitive fields, cause and members are scrubbed. */
function sanitizeError(error: Error, depth = 0): Error {
  const clone = new Error(redactString(String(error.message)));
  const name = typeof error.name === "string" && ERROR_NAME.test(error.name) ? error.name : "Error";
  Object.defineProperty(clone, "name", { value: name, enumerable: false, configurable: true });
  Object.defineProperty(clone, "stack", {
    value:
      typeof error.stack === "string" ? sanitizeStack(error.stack) : `${name}: ${clone.message}`,
    enumerable: false,
    configurable: true,
    writable: true,
  });
  const fields: Record<string, unknown> = {};
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(error)) {
    if (["cause", "errors", "name", "message", "stack"].includes(key)) continue;
    if (isSafeErrorField(key, value)) {
      safe[key] = value;
    } else if (value === null || (typeof value !== "object" && typeof value !== "function")) {
      fields[key] = value;
    }
  }
  Object.assign(clone, redactDeep(fields));
  // Applied after redactDeep: `code` and `statusCode` are sensitive key names, but these shapes
  // (SQLSTATE, ECONNREFUSED, HTTP status) carry no data.
  Object.assign(clone, safe);
  const nested = (value: unknown): unknown =>
    isError(value) && depth + 1 <= MAX_ERROR_DEPTH
      ? sanitizeError(value, depth + 1)
      : isError(value)
        ? "[truncated]"
        : redactDeep(value);
  if (error.cause !== undefined) {
    Object.defineProperty(clone, "cause", {
      value: nested(error.cause),
      enumerable: false,
      configurable: true,
      writable: true,
    });
  }
  const members = (error as { errors?: unknown }).errors;
  if (Array.isArray(members)) {
    Object.defineProperty(clone, "errors", {
      value: members.slice(0, 50).map(nested),
      enumerable: false,
      configurable: true,
      writable: true,
    });
  }
  return clone;
}

function sanitizeObject(value: Record<string, unknown>): Record<string, unknown> {
  if (isAccessLogEntry(value)) return { ...value };
  if (isAuditEventEntry(value)) {
    return { ...value, removed: { ...(value.removed as Record<string, unknown>) } };
  }
  // redactDeep walks the whole object once, with its depth and node bounds.
  return redactDeep(value) as Record<string, unknown>;
}

/**
 * Scrubs one logged value: strings, Errors (message and stack), plain objects and anything else.
 * Fails closed: if anything throws (getters, proxies, hostile toString) the result is a fixed
 * placeholder, never the raw input.
 */
export function sanitizeLogValue(value: unknown): unknown {
  try {
    if (typeof value === "string") return redactString(value);
    if (isError(value)) return sanitizeError(value);
    if (isPlainObject(value)) return sanitizeObject(value);
    return redactDeep(value);
  } catch {
    return SCRUB_FAILED;
  }
}

function safeContext(context: unknown): string {
  return typeof context === "string" && CONTEXT.test(context) ? context : "";
}

/**
 * The current request id when it is printable verbatim. The middleware only ever stores ids that
 * pass this check; it is re-checked here so a logger can never print an unchecked value.
 */
interface JsonLogOptions {
  context: string;
  logLevel: LogLevel;
  writeStreamType?: "stdout" | "stderr";
  errorStack?: unknown;
  params?: Record<string, unknown>;
  error?: Error;
}
type JsonLogObject = {
  [key: string]: unknown;
  level: LogLevel;
  pid: number;
  timestamp: number;
  message: unknown;
};

function printableRequestId(): string | undefined {
  const id = currentRequestId();
  return isSafeRequestId(id) ? id : undefined;
}

/**
 * Nest's ConsoleLogger with every printed value scrubbed. All paths (log, error with a stack param,
 * error with an Error object, ExceptionsHandler, Logger.* from providers) end in `printMessages`,
 * which receives the message list, context, stack and structured params; the separate text-mode
 * stack line goes through `printStackTrace`. Both are overridden, so nothing reaches stdout/stderr
 * unscrubbed. Level, context (class name), timestamp and pid are not user data and pass through.
 *
 * Every line written while a request is being served carries its request id (M14): a top-level
 * `requestId` field in JSON mode, `[rid:<id>]` after the context in text mode.
 */
export class ScrubbingConsoleLogger extends ConsoleLogger {
  // Nest parses the arguments (merging plain-object params, which runs getters) before it reaches
  // printMessages, so the public methods are guarded too: a logger must never throw into its caller.
  override log(message: unknown, ...optionalParams: unknown[]): void {
    try {
      super.log(message, ...optionalParams);
    } catch {
      this.printFailure("log", undefined, "stdout");
    }
  }

  override error(message: unknown, ...optionalParams: unknown[]): void {
    try {
      super.error(message, ...optionalParams);
    } catch {
      this.printFailure("error", undefined, "stderr");
    }
  }

  override warn(message: unknown, ...optionalParams: unknown[]): void {
    try {
      super.warn(message, ...optionalParams);
    } catch {
      this.printFailure("warn", undefined, "stdout");
    }
  }

  override debug(message: unknown, ...optionalParams: unknown[]): void {
    try {
      super.debug(message, ...optionalParams);
    } catch {
      this.printFailure("debug", undefined, "stdout");
    }
  }

  override verbose(message: unknown, ...optionalParams: unknown[]): void {
    try {
      super.verbose(message, ...optionalParams);
    } catch {
      this.printFailure("verbose", undefined, "stdout");
    }
  }

  override fatal(message: unknown, ...optionalParams: unknown[]): void {
    try {
      super.fatal(message, ...optionalParams);
    } catch {
      this.printFailure("fatal", undefined, "stderr");
    }
  }

  protected override printMessages(
    messages: unknown[],
    context = "",
    logLevel: LogLevel = "log",
    writeStreamType?: "stdout" | "stderr",
    errorStack?: unknown,
    params?: Record<string, unknown>,
  ): void {
    try {
      // Text mode prints strings raw, so line breaks and control characters are escaped there. JSON
      // mode serialises them safely.
      const text = !this.options.json;
      const cleanMessages = messages.map((message) => {
        try {
          const clean = sanitizeLogValue(this.resolveMessage(message));
          return text && typeof clean === "string" ? escapeControl(clean) : clean;
        } catch {
          return SCRUB_FAILED;
        }
      });
      const cleanParams = params === undefined ? undefined : sanitizeLogValue(params);
      super.printMessages(
        cleanMessages,
        typeof context === "string" && CONTEXT.test(context)
          ? context
          : escapeControl(redactString(context)),
        logLevel,
        writeStreamType,
        typeof errorStack === "string" ? sanitizeStack(errorStack) : undefined,
        typeof cleanParams === "object" && cleanParams !== null
          ? (cleanParams as Record<string, unknown>)
          : cleanParams === undefined
            ? undefined
            : { scrubbing: SCRUB_FAILED },
      );
    } catch {
      this.printFailure(logLevel, context, writeStreamType);
    }
  }

  protected override getJsonLogObject(message: unknown, options: JsonLogOptions): JsonLogObject {
    const logObject = super.getJsonLogObject(message, options);
    const requestId = printableRequestId();
    return requestId === undefined ? logObject : { ...logObject, requestId };
  }

  protected override formatContext(context: string): string {
    const formatted = super.formatContext(context);
    const requestId = printableRequestId();
    return requestId === undefined ? formatted : `${formatted}[rid:${requestId}] `;
  }

  protected override printStackTrace(stack: string): void {
    // Like the stock logger: nothing to print without a stack (and never a literal "undefined").
    if (typeof stack !== "string" || !stack) return;
    try {
      super.printStackTrace(sanitizeStack(stack));
    } catch {
      this.printFailure("error", undefined, "stderr");
    }
  }

  /** Last resort: a fixed line with the level and, if it is a plain class name, the context. */
  private printFailure(
    logLevel: LogLevel,
    context: unknown,
    writeStreamType?: "stdout" | "stderr",
  ): void {
    try {
      super.printMessages([SCRUB_FAILED], safeContext(context), logLevel, writeStreamType);
    } catch {
      // Nothing safe is left to print, and a logger must never throw into its caller.
    }
  }
}
