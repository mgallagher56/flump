import { randomUUID } from "node:crypto";
import {
  type ErrorIssue,
  type ErrorResponse,
  errorCodeForStatus,
  type ValidationIssue,
} from "@flump/api-contract";
import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  Logger,
} from "@nestjs/common";
import { reportException } from "../observability/report";

const SAFE_REQUEST_ID = /^[A-Za-z0-9._-]{1,64}$/;
const SNAKE_CODE = /^[a-z][a-z0-9_]{1,63}$/;
const MAX_ISSUES = 20;
const MAX_TEXT = 300;

/** The message for every unexpected failure: no stack, class name or provider text. */
export const GENERIC_ERROR_MESSAGE = "Something went wrong. Please try again.";

interface RequestLike {
  requestId?: unknown;
  headers?: Record<string, unknown>;
}

interface ResponseLike {
  headersSent?: boolean;
  status(code: number): ResponseLike;
  json(body: unknown): unknown;
  setHeader?(name: string, value: string): unknown;
  end?(): unknown;
}

/** The request id from the request-context middleware, else a safe client header, else none. */
export function requestIdOf(req: RequestLike | undefined): string | undefined {
  const raw =
    req?.requestId ?? req?.headers?.["x-request-id"] ?? req?.headers?.["x-railway-request-id"];
  return typeof raw === "string" && SAFE_REQUEST_ID.test(raw) ? raw : undefined;
}

export interface ErrorDescription {
  status: number;
  code: string;
  message: string;
  issues?: ErrorIssue[];
  /** Extra response headers, for example Retry-After on a database timeout. */
  headers?: Record<string, string>;
}

const text = (value: string): string => value.slice(0, MAX_TEXT);

const issuesFrom = (raw: unknown): ErrorIssue[] | undefined => {
  if (!Array.isArray(raw)) return undefined;
  return raw.slice(0, MAX_ISSUES).flatMap((item: Partial<ValidationIssue>) =>
    item && typeof item.path === "string" && typeof item.code === "string"
      ? [
          {
            path: text(item.path),
            code: text(item.code),
            message: text(typeof item.message === "string" ? item.message : item.code),
          },
        ]
      : [],
  );
};

/**
 * The 4xx status of an http-errors error from Express middleware (body-parser and friends), which
 * sets a string `type` (for example `entity.too.large`) and `expose: true` on client errors. Any
 * other error with a `status` (a provider SDK error carrying the upstream 401, say) is not the
 * client's fault and stays a 500.
 */
const httpErrorStatus = (exception: unknown): number | undefined => {
  const candidate = exception as {
    status?: unknown;
    statusCode?: unknown;
    type?: unknown;
    expose?: unknown;
  } | null;
  if (typeof candidate?.type !== "string" || candidate.expose !== true) return undefined;
  const status = candidate.status ?? candidate.statusCode;
  return typeof status === "number" && status >= 400 && status < 500 ? status : undefined;
};

/** Postgres SQLSTATE of a TypeORM QueryFailedError (`driverError.code`), or of a bare pg error. */
const pgCodeOf = (exception: unknown): string | undefined => {
  const e = exception as { code?: unknown; driverError?: { code?: unknown } } | null;
  const code = e?.driverError?.code ?? e?.code;
  return typeof code === "string" && /^[0-9A-Z]{5}$/.test(code) ? code : undefined;
};

/** check_violation: a row broke a CHECK constraint (for example the liability sign rule). */
const PG_CHECK_VIOLATION = "23514";
/** unique_violation: a concurrent or repeated write hit a unique index. */
const PG_UNIQUE_VIOLATION = "23505";
/** lock_not_available (lock timeout) and query_canceled (statement timeout): try again. */
const PG_RETRYABLE = new Set(["55P03", "57014"]);
export const DB_RETRY_AFTER_SECONDS = "2";

const CLIENT_ERROR_MESSAGES: Record<number, string> = {
  400: "The request could not be read.",
  413: "The request body is too large.",
  415: "The request body must be JSON.",
};

/**
 * Maps any thrown value to the ErrorResponse fields (BE-09, M-API2). HttpExceptions keep their
 * status and their message (they are written for users), and name their code with a `code` or a
 * snake_case `error` field; otherwise the status picks the code. Anything else is a 500 with a
 * generic message: no stack, class name or internal text reaches the client.
 */
export function describeException(exception: unknown): ErrorDescription {
  if (exception instanceof HttpException) {
    const status = exception.getStatus();
    const body = exception.getResponse();
    const fields =
      typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
    const named = [fields.code, fields.error].find(
      (value): value is string => typeof value === "string" && SNAKE_CODE.test(value),
    );
    let message =
      typeof body === "string"
        ? body
        : typeof fields.message === "string"
          ? fields.message
          : Array.isArray(fields.message)
            ? fields.message.filter((m) => typeof m === "string").join("; ")
            : exception.message;
    let code = named ?? errorCodeForStatus(status);
    // Nest turns body-parser's SyntaxError into a 400 whose message can quote the body.
    if (!named && status === 400 && /JSON/.test(message)) {
      code = "invalid_json";
      message = "The request body is not valid JSON.";
    }
    // Nest's own unmatched-route 404 names the method and path.
    if (!named && status === 404 && /^Cannot [A-Z]+ /.test(message)) message = "Not found";
    // Nest wraps body-parser's size and media-type errors with the parser's own wording.
    if (!named && (status === 413 || status === 415))
      message = CLIENT_ERROR_MESSAGES[status] ?? message;
    if (status === 500) message = GENERIC_ERROR_MESSAGE;
    const issues = issuesFrom(fields.issues);
    return { status, code, message: text(message), ...(issues ? { issues } : {}) };
  }
  const pgCode = pgCodeOf(exception);
  if (pgCode === PG_CHECK_VIOLATION) {
    // Generic on purpose: the constraint and column names are schema internals.
    return {
      status: 422,
      code: "constraint_violation",
      message: "The request breaks a data rule and was not saved.",
    };
  }
  if (pgCode === PG_UNIQUE_VIOLATION) {
    // Generic on purpose: the index name and the duplicate value are schema internals.
    return {
      status: 409,
      code: "conflict",
      message: "This conflicts with something that already exists. Reload and try again.",
    };
  }
  if (pgCode && PG_RETRYABLE.has(pgCode)) {
    return {
      status: 503,
      code: "service_unavailable",
      message: "The service is busy. Please try again shortly.",
      headers: { "Retry-After": DB_RETRY_AFTER_SECONDS },
    };
  }
  const clientStatus = httpErrorStatus(exception);
  if (clientStatus !== undefined) {
    const isJsonSyntax = clientStatus === 400 && exception instanceof SyntaxError;
    return {
      status: clientStatus,
      code: isJsonSyntax ? "invalid_json" : errorCodeForStatus(clientStatus),
      message: isJsonSyntax
        ? "The request body is not valid JSON."
        : (CLIENT_ERROR_MESSAGES[clientStatus] ?? "The request could not be processed."),
    };
  }
  return { status: 500, code: "internal_error", message: GENERIC_ERROR_MESSAGE };
}

/**
 * Sentry reporting as before BE-09: unexpected errors and any 5xx (database timeouts included).
 * Client errors are not sent. A check violation is sent: the contract should have caught it.
 */
const shouldReport = (exception: unknown, status: number): boolean =>
  status >= 500 ||
  pgCodeOf(exception) === PG_CHECK_VIOLATION ||
  (!(exception instanceof HttpException) &&
    httpErrorStatus(exception) === undefined &&
    pgCodeOf(exception) !== PG_UNIQUE_VIOLATION);

/**
 * The one global exception filter (BE-09): every error becomes an ErrorResponse
 * `{ code, message, issues?, requestId }`, and unexpected errors and 5xx are reported to Sentry
 * with the request id. Registered through APP_FILTER in ObservabilityModule, so every app built
 * from AppModule (main.ts and the e2e-style specs) uses it.
 */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger("ExceptionsHandler");

  catch(exception: unknown, host: ArgumentsHost): void {
    if (host.getType() !== "http") throw exception;
    const http = host.switchToHttp();
    const req = http.getRequest<RequestLike | undefined>();
    const res = http.getResponse<ResponseLike>();
    const description = describeException(exception);
    const knownId = requestIdOf(req);
    // As Nest's default handler did: unexpected errors are logged with their stack (the app
    // logger scrubs secrets and personal data). Client errors are not logged here.
    if (description.status >= 500 && !(exception instanceof HttpException)) {
      try {
        const error = exception instanceof Error ? exception : new Error(String(exception));
        this.logger.error(error.message, error.stack);
      } catch {
        // Logging must never change the HTTP response.
      }
    }
    try {
      if (shouldReport(exception, description.status)) reportException(exception, knownId);
    } catch {
      // Reporting must never change the HTTP response.
    }
    if (res.headersSent) {
      res.end?.();
      return;
    }
    const requestId = knownId ?? randomUUID();
    if (!knownId) res.setHeader?.("x-request-id", requestId);
    const body: ErrorResponse = {
      code: description.code,
      message: description.message,
      ...(description.issues ? { issues: description.issues } : {}),
      requestId,
    };
    for (const [name, value] of Object.entries(description.headers ?? {})) {
      res.setHeader?.(name, value);
    }
    res.status(description.status).json(body);
  }
}
