import { ErrorResponse } from "@flump/api-contract";
import {
  type ArgumentsHost,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Logger,
  NotFoundException,
  PayloadTooLargeException,
  PreconditionFailedException,
  ServiceUnavailableException,
  UnauthorizedException,
  UnsupportedMediaTypeException,
} from "@nestjs/common";
import { QueryFailedError } from "typeorm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { reportException } from "../observability/report";
import { rejectRateLimited } from "../security/rate-limit.http";
import {
  ApiExceptionFilter,
  describeException,
  GENERIC_ERROR_MESSAGE,
} from "./api-exception.filter";

vi.mock("../observability/report", () => ({ reportException: vi.fn() }));

const REQUEST_ID = "6f1c1f3e-9d6e-4c0e-9f43-0a1b2c3d4e5f";

function setup(req: Record<string, unknown> = { requestId: REQUEST_ID, headers: {} }) {
  const res = {
    headersSent: false,
    statusCode: 0,
    body: undefined as unknown,
    headers: {} as Record<string, string>,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      return this;
    },
    setHeader(name: string, value: string) {
      this.headers[name] = value;
    },
    end: vi.fn(),
  };
  const host = {
    getType: () => "http",
    switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }),
  } as unknown as ArgumentsHost;
  return { res, host };
}

function run(exception: unknown, req?: Record<string, unknown>) {
  const { res, host } = setup(req);
  new ApiExceptionFilter().catch(exception, host);
  // Every body must be a valid ErrorResponse (strict: no statusCode, error or stack).
  expect(ErrorResponse.safeParse(res.body).success).toBe(true);
  // Every error tells the user something: the message is never empty.
  expect((res.body as ErrorResponse).message.length).toBeGreaterThan(0);
  return res as typeof res & { body: ErrorResponse };
}

describe("ApiExceptionFilter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
  });

  it("logs an unexpected error with its stack, and not a client error", () => {
    const error = vi.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
    run(new Error("kaboom"));
    expect(error).toHaveBeenCalledWith("kaboom", expect.stringContaining("kaboom"));
    error.mockClear();
    run(new NotFoundException());
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });

  it.each([
    [new BadRequestException("balance must be a finite number"), 400, "validation_failed"],
    [new UnauthorizedException("Authentication failed"), 401, "unauthorized"],
    [new ForbiddenException(), 403, "forbidden"],
    [new NotFoundException("Account not found"), 404, "not_found"],
    [new ConflictException("Batch is not staged"), 409, "conflict"],
    [new PreconditionFailedException("Stale"), 412, "precondition_failed"],
    [new PayloadTooLargeException(), 413, "payload_too_large"],
    [new ServiceUnavailableException("Password reset is unavailable."), 503, "service_unavailable"],
  ])("maps %s to its status and code with the request id", (exception, status, code) => {
    const res = run(exception);
    expect(res.statusCode).toBe(status);
    expect(res.body.code).toBe(code);
    expect(res.body.requestId).toBe(REQUEST_ID);
    expect(res.body.issues).toBeUndefined();
  });

  it("keeps a deliberate message", () => {
    expect(run(new NotFoundException("Account not found")).body.message).toBe("Account not found");
  });

  it("turns a contract validation error into validation_failed with its issues", () => {
    const res = run(
      new BadRequestException({
        code: "validation_failed",
        message: "Request failed validation",
        issues: [
          { path: "body.balance", code: "invalid_type", message: "Expected number" },
          { path: "body.userId", code: "unrecognized_keys", message: "Unknown field" },
          "junk",
        ],
      }),
    );
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      code: "validation_failed",
      message: "Request failed validation",
      issues: [
        { path: "body.balance", code: "invalid_type", message: "Expected number" },
        { path: "body.userId", code: "unrecognized_keys", message: "Unknown field" },
      ],
      requestId: REQUEST_ID,
    });
  });

  it("keeps a named snake_case code from `code` or `error`", () => {
    expect(
      run(new ForbiddenException({ statusCode: 403, error: "not_invited", message: "Not invited" }))
        .body.code,
    ).toBe("not_invited");
    expect(run(new NotFoundException({ code: "feature_disabled", message: "Off" })).body.code).toBe(
      "feature_disabled",
    );
    // Nest's default "Bad Request" error name is not a code.
    expect(run(new BadRequestException("x")).body.code).toBe("validation_failed");
  });

  it("answers a rate limit with rate_limited and Retry-After", () => {
    const { res: headerSink } = setup();
    let thrown: unknown;
    try {
      rejectRateLimited(
        headerSink,
        { allowed: false, retryAfterSeconds: 42 } as never,
        "/accounts",
      );
    } catch (error) {
      thrown = error;
    }
    expect(headerSink.headers["Retry-After"]).toBe("42");
    const res = run(thrown);
    expect(res.statusCode).toBe(429);
    expect(res.body.code).toBe("rate_limited");
  });

  it("answers the imports guard's not_found the same way", () => {
    const res = run(new NotFoundException({ code: "not_found", message: "Not found" }));
    expect(res.body).toEqual({ code: "not_found", message: "Not found", requestId: REQUEST_ID });
  });

  it("hides Nest's route-not-found path", () => {
    expect(run(new NotFoundException("Cannot GET /secret/abc")).body.message).toBe("Not found");
  });

  it("turns an unknown error into a generic 500 and reports it", () => {
    const error = new Error("connection to db-internal:5432 refused");
    const res = run(error);
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      code: "internal_error",
      message: GENERIC_ERROR_MESSAGE,
      requestId: REQUEST_ID,
    });
    expect(JSON.stringify(res.body)).not.toContain("db-internal");
    expect(reportException).toHaveBeenCalledWith(error, REQUEST_ID);
  });

  it("hides the message of a 500 HttpException and reports it", () => {
    const res = run(
      new HttpException("provider said: token abc", HttpStatus.INTERNAL_SERVER_ERROR),
    );
    expect(res.body.message).toBe(GENERIC_ERROR_MESSAGE);
    expect(reportException).toHaveBeenCalledTimes(1);
  });

  it("reports 5xx HttpExceptions but not client errors", () => {
    run(new ServiceUnavailableException("x"));
    expect(reportException).toHaveBeenCalledTimes(1);
    vi.clearAllMocks();
    for (const e of [
      new BadRequestException(),
      new UnauthorizedException(),
      new NotFoundException(),
    ]) {
      run(e);
    }
    expect(reportException).not.toHaveBeenCalled();
  });

  it("maps body-parser errors without echoing the body", () => {
    const tooLarge = Object.assign(new Error("request entity too large"), {
      status: 413,
      type: "entity.too.large",
      expose: true,
    });
    const res = run(tooLarge);
    expect(res.statusCode).toBe(413);
    expect(res.body.code).toBe("payload_too_large");
    // Nest's wrapped form keeps the same wording.
    expect(run(new PayloadTooLargeException("request entity too large")).body).toMatchObject({
      code: "payload_too_large",
      message: "The request body is too large.",
    });
    const syntax = Object.assign(
      new SyntaxError('Unexpected token s, "secret" is not valid JSON'),
      { status: 400, type: "entity.parse.failed", expose: true },
    );
    const bad = run(syntax);
    expect(bad.body.code).toBe("invalid_json");
    expect(bad.body.message).not.toContain("secret");
    // Nest wraps body-parser's SyntaxError in a BadRequestException with the parser's message.
    const wrapped = run(new BadRequestException('Unexpected token s, "secret" is not valid JSON'));
    expect(wrapped.body).toMatchObject({ code: "invalid_json" });
    expect(wrapped.body.message).not.toContain("secret");
    expect(reportException).not.toHaveBeenCalled();
  });

  it("does not trust the status of an error that is not an http-errors client error", () => {
    // A provider SDK error carrying the upstream 401 is our failure, not the caller's.
    class BankProviderError extends Error {
      status = 401;
      statusCode = 401;
    }
    const provider = new BankProviderError("upstream rejected client_secret=abc");
    const res = run(provider);
    expect(res.statusCode).toBe(500);
    expect(res.body.code).toBe("internal_error");
    expect(JSON.stringify(res.body)).not.toContain("client_secret");
    expect(reportException).toHaveBeenCalledWith(provider, REQUEST_ID);
    vi.clearAllMocks();
    // A string type without expose (http-errors marks 5xx expose: false) is not trusted either.
    expect(
      run(Object.assign(new Error("x"), { status: 404, type: "x", expose: false })).statusCode,
    ).toBe(500);
    expect(run(Object.assign(new Error("x"), { status: 404, expose: true })).statusCode).toBe(500);
  });

  describe("Postgres errors (TypeORM QueryFailedError with driverError.code)", () => {
    const queryFailed = (code: string, detail: string) =>
      new QueryFailedError("UPDATE accounts SET balance = $1", [123], {
        code,
        message: detail,
        constraint: "CHK_accounts_liability_sign",
        column: "balance",
      } as unknown as Error);

    it("maps a check_violation (23514) to 422 constraint_violation without schema names", () => {
      const res = run(
        queryFailed("23514", 'new row violates check constraint "CHK_accounts_liability_sign"'),
      );
      expect(res.statusCode).toBe(422);
      expect(res.body.code).toBe("constraint_violation");
      expect(JSON.stringify(res.body)).not.toMatch(/CHK_|accounts|balance|UPDATE/);
      expect(res.headers["Retry-After"]).toBeUndefined();
    });

    it.each([
      ["55P03", "canceling statement due to lock timeout"],
      ["57014", "canceling statement due to statement timeout"],
    ])("maps %s to 503 service_unavailable with Retry-After: 2", (code, detail) => {
      const res = run(queryFailed(code, detail));
      expect(res.statusCode).toBe(503);
      expect(res.body.code).toBe("service_unavailable");
      expect(res.headers["Retry-After"]).toBe("2");
      expect(JSON.stringify(res.body)).not.toMatch(/timeout|canceling|accounts/);
      expect(reportException).toHaveBeenCalledTimes(1);
    });

    it("maps a unique_violation (23505) to 409 conflict without schema names or values", () => {
      const res = run(
        queryFailed(
          "23505",
          'duplicate key value violates unique constraint "UQ_x" Key (name)=(Ada)',
        ),
      );
      expect(res.statusCode).toBe(409);
      expect(res.body.code).toBe("conflict");
      expect(JSON.stringify(res.body)).not.toMatch(/UQ_|Ada|accounts|duplicate/);
      expect(reportException).not.toHaveBeenCalled();
    });

    it("still turns any other database error into a generic 500", () => {
      const res = run(queryFailed("42P01", 'relation "accounts" does not exist'));
      expect(res.statusCode).toBe(500);
      expect(res.body.code).toBe("internal_error");
      expect(res.headers["Retry-After"]).toBeUndefined();
    });
  });

  it("still answers when reporting throws", () => {
    vi.mocked(reportException).mockImplementationOnce(() => {
      throw new Error("sentry down");
    });
    expect(run(new Error("x")).statusCode).toBe(500);
  });

  it("falls back to a safe header id, then a fresh id echoed in x-request-id", () => {
    expect(
      run(new NotFoundException(), { headers: { "x-request-id": "abc-1" } }).body.requestId,
    ).toBe("abc-1");
    const res = run(new NotFoundException(), { headers: { "x-request-id": "a b\n<script>" } });
    expect(res.body.requestId).toMatch(/^[0-9a-f-]{36}$/);
    expect(res.headers["x-request-id"]).toBe(res.body.requestId);
  });

  it("does not write twice when headers were already sent", () => {
    const { res, host } = setup();
    res.headersSent = true;
    new ApiExceptionFilter().catch(new Error("late"), host);
    expect(res.body).toBeUndefined();
    expect(res.end).toHaveBeenCalled();
  });

  it("only takes a request id made wholly of safe characters", () => {
    // Ends in safe characters but starts with markup: the whole value must match, so a fresh id.
    const res = run(new NotFoundException(), { headers: { "x-request-id": "<b>abc-1" } });
    expect(res.body.requestId).not.toBe("<b>abc-1");
    expect(res.body.requestId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("only keeps a code that is wholly snake_case, else uses the status's code", () => {
    // "stale_row please reload" starts snake_case but has spaces, so the 409's own code is used.
    const res = run(new ConflictException({ code: "stale_row please reload", message: "Stale" }));
    expect(res.body.code).toBe("conflict");
  });

  it("joins a list of validation messages, skipping anything that is not text", () => {
    const res = run(
      new BadRequestException({ message: ["name must be a string", 5, "balance is required"] }),
    );
    // The two strings joined with "; ", the number dropped.
    expect(res.body.message).toBe("name must be a string; balance is required");
  });

  it("trusts only a 4xx status from an http-errors client error", () => {
    const httpError = (status: unknown) =>
      Object.assign(new Error("x"), { status, type: "some.type", expose: true });
    // 302 and 503 are not client errors, and "413" is not a number: all are our failure, a 500.
    for (const status of [302, 503, "413"]) {
      const res = run(httpError(status));
      expect(res.statusCode).toBe(500);
      expect(res.body.code).toBe("internal_error");
    }
    // 500 itself is not below 500: the generic message, not a client-error one.
    expect(run(httpError(500)).body).toMatchObject({
      code: "internal_error",
      message: GENERIC_ERROR_MESSAGE,
    });
  });

  it("words body-parser's own errors as Nest's wrapped forms are worded", () => {
    const parserError = (status: number, type: string, error = new Error("x")) =>
      Object.assign(error, { status, type, expose: true });
    // Same status, same user message, whichever layer raised it.
    expect(run(parserError(413, "entity.too.large")).body.message).toBe(
      run(new PayloadTooLargeException("request entity too large")).body.message,
    );
    expect(run(parserError(415, "encoding.unsupported")).body).toMatchObject({
      code: "unsupported_media_type",
      message: run(new UnsupportedMediaTypeException("unsupported charset")).body.message,
    });
    expect(run(parserError(400, "entity.parse.failed", new SyntaxError("x"))).body.message).toBe(
      run(new BadRequestException("Unexpected token in JSON")).body.message,
    );
    // A 400 that is not a JSON syntax error is not called invalid JSON.
    expect(run(parserError(400, "request.aborted")).body.code).toBe("validation_failed");
    // A 4xx with no wording of its own still gets a message.
    expect(run(parserError(404, "not.found")).body.code).toBe("not_found");
  });

  it("answers on a response without setHeader or end", () => {
    const { res, host } = setup();
    const bare = res as Partial<typeof res>;
    delete bare.setHeader;
    delete bare.end;
    new ApiExceptionFilter().catch(Object.assign(new Error("timeout"), { code: "57014" }), host);
    expect(res.statusCode).toBe(503);
    res.headersSent = true;
    expect(() => new ApiExceptionFilter().catch(new Error("late"), host)).not.toThrow();
  });

  it("describeException never leaks a non-Error value", () => {
    expect(describeException("boom")).toEqual({
      status: 500,
      code: "internal_error",
      message: GENERIC_ERROR_MESSAGE,
    });
  });
});
