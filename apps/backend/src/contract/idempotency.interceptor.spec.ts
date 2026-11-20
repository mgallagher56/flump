import { BadRequestException, ConflictException, Logger } from "@nestjs/common";
import { lastValueFrom, of } from "rxjs";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  canonicalJson,
  IdempotencyInterceptor,
  requestHash,
  sameHash,
} from "./idempotency.interceptor";

const contextFor = (req: Record<string, unknown>) =>
  ({
    getType: () => "http",
    switchToHttp: () => ({ getRequest: () => req, getResponse: () => ({ setHeader: vi.fn() }) }),
  }) as never;

describe("canonicalJson / requestHash", () => {
  it("ignores key order and undefined fields, keeps array order", () => {
    expect(canonicalJson({ b: 1, a: { d: [2, 1], c: null }, e: undefined })).toBe(
      '{"a":{"c":null,"d":[2,1]},"b":1}',
    );
    expect(requestHash({ name: "A", balance: 1 })).toBe(requestHash({ balance: 1, name: "A" }));
    expect(requestHash({ name: "A" })).not.toBe(requestHash({ name: "B" }));
    expect(requestHash(undefined)).toBe(requestHash({}));
    expect(requestHash({})).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("IdempotencyInterceptor", () => {
  const create = { method: "POST", route: { path: "/accounts" }, user: { id: "u1" }, body: {} };

  it("passes a request without the header straight through", async () => {
    const dataSource = { query: vi.fn() };
    const interceptor = new IdempotencyInterceptor(dataSource as never);
    const out = interceptor.intercept(contextFor({ ...create, headers: {} }), {
      handle: () => of("created"),
    });
    expect(await lastValueFrom(out)).toBe("created");
    expect(dataSource.query).not.toHaveBeenCalled();
  });

  it("ignores the header on routes that are not idempotent creates", async () => {
    const dataSource = { query: vi.fn() };
    const interceptor = new IdempotencyInterceptor(dataSource as never);
    for (const req of [
      { ...create, method: "PATCH", route: { path: "/accounts/:id" } },
      { ...create, route: { path: "/mcp-tokens" } },
      { ...create, route: { path: "/bank-connections" } },
      { ...create, route: { path: "/imports" } },
    ]) {
      const out = interceptor.intercept(
        contextFor({ ...req, headers: { "idempotency-key": "k" } }),
        {
          handle: () => of("ok"),
        },
      );
      expect(await lastValueFrom(out)).toBe("ok");
    }
    expect(dataSource.query).not.toHaveBeenCalled();
  });

  it("rejects a malformed key with 400 before touching the database", () => {
    const dataSource = { query: vi.fn() };
    const interceptor = new IdempotencyInterceptor(dataSource as never);
    for (const key of ["", "x".repeat(256), "café"]) {
      expect(() =>
        interceptor.intercept(contextFor({ ...create, headers: { "idempotency-key": key } }), {
          handle: () => of("ok"),
        }),
      ).toThrow(BadRequestException);
    }
    expect(dataSource.query).not.toHaveBeenCalled();
  });

  it("stores ETag and Location with the result, replays them, and sweeps the user's expired keys", async () => {
    const queries: [string, unknown[]][] = [];
    let stored: Record<string, unknown> | undefined;
    const dataSource = {
      query: vi.fn(async (sql: string, params: unknown[]) => {
        queries.push([sql, params]);
        if (sql.includes("INSERT")) return stored ? [] : [{ id: "row" }];
        if (sql.includes("UPDATE")) {
          stored = {
            request_hash: requestHash({}),
            status_code: params[3],
            response_body: JSON.parse(params[4] as string),
            response_headers: JSON.parse(params[5] as string),
          };
          return [];
        }
        if (sql.includes("SELECT")) return stored ? [stored] : [];
        return [];
      }),
    };
    const interceptor = new IdempotencyInterceptor(dataSource as never);
    const firstHeaders: Record<string, string> = { etag: '"2026-11-14T09:30:00.123Z"' };
    const first = {
      setHeader: vi.fn(),
      getHeader: (name: string) => firstHeaders[name],
    };
    const req = { ...create, headers: { "idempotency-key": "k" } };
    const ctx = (res: unknown) =>
      ({
        getType: () => "http",
        switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }),
      }) as never;
    await lastValueFrom(interceptor.intercept(ctx(first), { handle: () => of({ id: "a" }) }));
    expect(stored?.response_headers).toEqual({ etag: '"2026-11-14T09:30:00.123Z"' });

    // The first DELETE of a claim sweeps every expired key of this user, not only this one.
    const sweep = queries[0] as [string, unknown[]];
    expect(sweep[0]).toMatch(
      /DELETE FROM "idempotency_keys"\s+WHERE "user_id" = \$1\s+AND \("created_at" </,
    );
    expect(sweep[1][0]).toBe("u1");

    const replay = { setHeader: vi.fn(), getHeader: () => undefined };
    const handle = vi.fn(() => of({ id: "b" }));
    const body = await lastValueFrom(interceptor.intercept(ctx(replay), { handle }));
    expect(body).toEqual({ id: "a" });
    expect(handle).not.toHaveBeenCalled();
    expect(replay.setHeader).toHaveBeenCalledWith("Idempotent-Replayed", "true");
    expect(replay.setHeader).toHaveBeenCalledWith("etag", '"2026-11-14T09:30:00.123Z"');
  });
});

describe("sameHash", () => {
  it("matches equal digests and rejects different or differently sized ones", () => {
    expect(sameHash("abc123", "abc123")).toBe(true);
    expect(sameHash("abc123", "abc124")).toBe(false);
    expect(sameHash("abc123", "abc1234")).toBe(false);
  });
});

describe("canonicalJson edge values", () => {
  it("writes a date as its ISO string and an undefined array item as null, as JSON.stringify does", () => {
    // JSON.stringify(new Date("2026-11-14T09:30:00.000Z")) is the quoted ISO string.
    expect(canonicalJson(new Date("2026-11-14T09:30:00.000Z"))).toBe('"2026-11-14T09:30:00.000Z"');
    // JSON.stringify([undefined, 1]) is "[null,1]": an array keeps the slot.
    expect(canonicalJson([undefined, 1])).toBe("[null,1]");
    // A date nested in a body hashes by its instant, not as an empty object.
    expect(requestHash({ at: new Date("2026-11-14T09:30:00.000Z") })).not.toBe(
      requestHash({ at: {} }),
    );
  });
});

/** A fake of the idempotency_keys table holding one (user, route, key) row. */
const tableFake = (options: { failUpdate?: boolean } = {}) => {
  let row:
    | {
        request_hash: string;
        status_code: number | null;
        response_body: unknown;
        response_headers: Record<string, string> | null;
      }
    | undefined;
  const query = vi.fn(async (sql: string, params: unknown[]) => {
    if (sql.includes("INSERT")) {
      if (row) return [];
      row = {
        request_hash: params[3] as string,
        status_code: null,
        response_body: null,
        response_headers: null,
      };
      return [{ id: "row" }];
    }
    if (sql.includes("UPDATE")) {
      if (options.failUpdate) throw new Error("database unavailable");
      if (row) {
        row = {
          ...row,
          status_code: params[3] as number,
          response_body: JSON.parse(params[4] as string),
          response_headers: JSON.parse(params[5] as string),
        };
      }
      return [];
    }
    if (sql.includes("SELECT")) return row ? [row] : [];
    // The release DELETE frees a pending row; the claim's expiry sweep has nothing to expire here.
    if (sql.includes("DELETE") && !sql.includes("make_interval") && row?.status_code === null) {
      row = undefined;
    }
    return [];
  });
  return {
    dataSource: { query },
    setRow: (value: NonNullable<typeof row>) => {
      row = value;
    },
    row: () => row,
  };
};

const httpContext = (req: unknown, res: unknown) =>
  ({
    getType: () => "http",
    switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }),
  }) as never;

describe("IdempotencyInterceptor edge cases", () => {
  const keyed = {
    method: "POST",
    route: { path: "/accounts" },
    user: { id: "u1" },
    body: {},
    headers: { "idempotency-key": "k" },
  };

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("passes a non-http context straight through", async () => {
    const dataSource = { query: vi.fn() };
    const interceptor = new IdempotencyInterceptor(dataSource as never);
    const out = interceptor.intercept({ getType: () => "rpc" } as never, {
      handle: () => of("rpc"),
    });
    expect(await lastValueFrom(out)).toBe("rpc");
    expect(dataSource.query).not.toHaveBeenCalled();
  });

  it("passes through a request with no headers, no route, no method or no signed-in user", async () => {
    const dataSource = { query: vi.fn() };
    const interceptor = new IdempotencyInterceptor(dataSource as never);
    const { headers: _headers, ...noHeaders } = keyed;
    const { route: _route, ...noRoute } = keyed;
    const { method: _method, ...noMethod } = keyed;
    const { user: _user, ...noUser } = keyed;
    for (const req of [noHeaders, noRoute, noMethod, noUser, { ...keyed, user: { id: 7 } }]) {
      const out = interceptor.intercept(contextFor(req), { handle: () => of("ok") });
      expect(await lastValueFrom(out)).toBe("ok");
    }
    // Without a user there is no owner to file the key under, so nothing is stored.
    expect(dataSource.query).not.toHaveBeenCalled();
  });

  it("names the header field in the 400 for a malformed key", () => {
    const interceptor = new IdempotencyInterceptor({ query: vi.fn() } as never);
    let thrown: unknown;
    try {
      interceptor.intercept(contextFor({ ...keyed, headers: { "idempotency-key": "" } }), {
        handle: () => of("ok"),
      });
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(BadRequestException);
    // The same validation_failed shape the contract interceptor uses for a bad field.
    expect((thrown as BadRequestException).getResponse()).toMatchObject({
      code: "validation_failed",
      issues: [{ path: "headers.idempotency-key", code: "invalid_string" }],
    });
  });

  it("answers 409 conflict while the first request with the key is still running", async () => {
    const table = tableFake();
    table.setRow({
      request_hash: requestHash({}),
      status_code: null,
      response_body: null,
      response_headers: null,
    });
    const interceptor = new IdempotencyInterceptor(table.dataSource as never);
    const handle = vi.fn(() => of({ id: "b" }));
    const out = interceptor.intercept(httpContext(keyed, { setHeader: vi.fn() }), { handle });
    const error = await lastValueFrom(out).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ConflictException);
    expect((error as ConflictException).getResponse()).toMatchObject({ code: "conflict" });
    expect(handle).not.toHaveBeenCalled();
  });

  it("replays only ETag and Location from a stored result", async () => {
    const table = tableFake();
    table.setRow({
      request_hash: requestHash({}),
      status_code: 201,
      response_body: { id: "a" },
      response_headers: {
        etag: '"2026-11-14T09:30:00.123Z"',
        location: "/v1/accounts/a",
        "set-cookie": "s=1",
      },
    });
    const interceptor = new IdempotencyInterceptor(table.dataSource as never);
    const res = { setHeader: vi.fn() };
    const body = await lastValueFrom(
      interceptor.intercept(httpContext(keyed, res), { handle: () => of({ id: "b" }) }),
    );
    expect(body).toEqual({ id: "a" });
    expect(res.setHeader).toHaveBeenCalledWith("location", "/v1/accounts/a");
    expect(res.setHeader).not.toHaveBeenCalledWith("set-cookie", expect.anything());
  });

  it("stores a numeric header value as text, and copes with a response that cannot read headers", async () => {
    const numeric = tableFake();
    const numericRes = {
      setHeader: vi.fn(),
      getHeader: (name: string) => (name === "etag" ? 42 : undefined),
    };
    await lastValueFrom(
      new IdempotencyInterceptor(numeric.dataSource as never).intercept(
        httpContext(keyed, numericRes),
        { handle: () => of({ id: "a" }) },
      ),
    );
    // String(42) is "42".
    expect(numeric.row()?.response_headers).toEqual({ etag: "42" });

    const bare = tableFake();
    const body = await lastValueFrom(
      new IdempotencyInterceptor(bare.dataSource as never).intercept(
        httpContext(keyed, { setHeader: vi.fn() }),
        { handle: () => of({ id: "a" }) },
      ),
    );
    expect(body).toEqual({ id: "a" });
    expect(bare.row()?.response_headers).toEqual({});
  });

  it("replays a create that returned no body instead of running it twice", async () => {
    const table = tableFake();
    const interceptor = new IdempotencyInterceptor(table.dataSource as never);
    await lastValueFrom(
      interceptor.intercept(httpContext(keyed, { setHeader: vi.fn() }), {
        handle: () => of(undefined),
      }),
    );
    const retry = vi.fn(() => of(undefined));
    const res = { setHeader: vi.fn() };
    await lastValueFrom(interceptor.intercept(httpContext(keyed, res), { handle: retry }));
    expect(retry).not.toHaveBeenCalled();
    expect(res.setHeader).toHaveBeenCalledWith("Idempotent-Replayed", "true");
  });

  it("keeps a successful create when its result cannot be stored", async () => {
    // The source says the create succeeded and failing to store the replay must not turn it into
    // an error. What a retry with the same key then does is an open question (see the ledger).
    vi.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
    const table = tableFake({ failUpdate: true });
    const interceptor = new IdempotencyInterceptor(table.dataSource as never);
    const first = await lastValueFrom(
      interceptor.intercept(httpContext(keyed, { setHeader: vi.fn() }), {
        handle: () => of({ id: "a" }),
      }),
    );
    expect(first).toEqual({ id: "a" });
  });
});
