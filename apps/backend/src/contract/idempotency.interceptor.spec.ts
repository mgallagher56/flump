import { BadRequestException } from "@nestjs/common";
import { lastValueFrom, of } from "rxjs";
import { describe, expect, it, vi } from "vitest";
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
