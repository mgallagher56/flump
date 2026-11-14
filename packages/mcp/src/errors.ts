import { randomUUID } from "node:crypto";

/** Tool error codes (E17 draft 6.6; CONFLICT, LIMIT_EXCEEDED and UNAVAILABLE added for staging, re-plan PR D). */
export const FLUMP_ERROR_CODES = [
  "INVALID_ARGUMENT",
  "MISSING_DATA",
  "NOT_FOUND",
  "INSUFFICIENT_SCOPE",
  "UNSUPPORTED_TAX_YEAR",
  "CALCULATION_UNVERIFIED_BLOCKED",
  "RATE_LIMITED",
  "CONFIRMATION_EXPIRED",
  "CONFIRMATION_MISMATCH",
  /** The request conflicts with the batch's state (not open, expired, key reused). */
  "CONFLICT",
  /** A cap was reached (rows per batch, open batches per user). Not retryable as sent. */
  "LIMIT_EXCEEDED",
  /** The tool exists but this connection cannot run it (staging over stdio). Not a scope problem. */
  "UNAVAILABLE",
  "INTERNAL",
] as const;

export type FlumpErrorCode = (typeof FLUMP_ERROR_CODES)[number];

export interface FlumpErrorBody {
  code: FlumpErrorCode;
  message: string;
  hint: string;
  retryable: boolean;
  field?: string;
  /** MISSING_DATA: the questions to put to the user. */
  askUser?: string[];
  /** UNSUPPORTED_TAX_YEAR: the years that are supported. */
  supportedYears?: string[];
  /** RATE_LIMITED. */
  retryAfterSeconds?: number;
  /** INTERNAL only: lets the owner find the log line. Carries no detail. */
  correlationId?: string;
}

export interface FlumpToolErrorInit {
  hint?: string;
  retryable?: boolean;
  field?: string;
  askUser?: string[];
  supportedYears?: string[];
  retryAfterSeconds?: number;
}

/** Throw from a tool handler to return a structured `isError` result. */
export class FlumpToolError extends Error {
  readonly code: FlumpErrorCode;
  readonly init: FlumpToolErrorInit;

  constructor(code: FlumpErrorCode, message: string, init: FlumpToolErrorInit = {}) {
    super(message);
    this.name = "FlumpToolError";
    this.code = code;
    this.init = init;
  }

  toBody(): FlumpErrorBody {
    const { hint, retryable, ...rest } = this.init;
    const extras = Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined));
    return {
      code: this.code,
      message: this.message,
      hint: hint ?? "",
      retryable: retryable ?? this.code === "RATE_LIMITED",
      ...extras,
    };
  }
}

/** The only shape an unexpected exception takes: no message, no stack, only a correlation id. */
export function internalErrorBody(correlationId: string = randomUUID()): FlumpErrorBody {
  return {
    code: "INTERNAL",
    message: "Flump could not run this tool.",
    hint: "Try again. If it keeps failing, quote the correlation id to support.",
    retryable: true,
    correlationId,
  };
}

export interface ErrorResult {
  [key: string]: unknown;
  isError: true;
  content: Array<{ type: "text"; text: string }>;
}

export function errorResult(body: FlumpErrorBody): ErrorResult {
  return {
    isError: true,
    content: [{ type: "text", text: JSON.stringify({ error: body }) }],
  };
}
