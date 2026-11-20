import { HttpException, Logger, ServiceUnavailableException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { lastValueFrom, of } from "rxjs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RATE_LIMIT_CLASS, RATE_LIMIT_SKIP, type RateLimitClass } from "./rate-limit.decorator";
import {
  MemorySharedRateLimitStore,
  RateLimitStore,
  type SharedRateLimitStore,
} from "./rate-limit.store";
import { UserRateLimitInterceptor } from "./user-rate-limit.interceptor";

const handler = () => undefined;

function context(cls: RateLimitClass | undefined, method = "POST") {
  const req = { method, path: "/x", route: { path: "/x" }, user: { id: "user-1" } };
  const res = { setHeader: vi.fn() };
  const ctx = {
    getType: () => "http",
    getHandler: () => handler,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }),
  };
  const reflector = new Reflector();
  vi.spyOn(reflector, "getAllAndOverride").mockImplementation((key) =>
    key === RATE_LIMIT_CLASS ? cls : undefined,
  );
  return { ctx: ctx as never, reflector };
}

const broken = (code?: string): SharedRateLimitStore => ({
  hit: () => Promise.reject(Object.assign(new Error("db down"), code ? { code } : {})),
  peek: () => Promise.reject(new Error("db down")),
  reset: () => Promise.reject(new Error("db down")),
  refund: () => Promise.reject(new Error("db down")),
});

const run = (interceptor: UserRateLimitInterceptor, ctx: never) =>
  lastValueFrom(interceptor.intercept(ctx, { handle: () => of("ok") }));

describe("UserRateLimitInterceptor shared buckets (M10)", () => {
  beforeEach(() => {
    vi.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
    vi.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
  });
  afterEach(() => vi.restoreAllMocks());

  it("counts credential, mint and destructive in the shared store, reads and writes in memory", async () => {
    const shared = new MemorySharedRateLimitStore();
    const hit = vi.spyOn(shared, "hit");
    const memory = new RateLimitStore();
    for (const cls of ["credential", "tokenMint", "destructive"] as const) {
      const { ctx, reflector } = context(cls);
      await run(new UserRateLimitInterceptor(reflector, memory, shared), ctx);
    }
    const { ctx, reflector } = context(undefined, "GET");
    await run(new UserRateLimitInterceptor(reflector, memory, shared), ctx);
    expect(hit.mock.calls.map((c) => c[0])).toEqual([
      "user:user-1:credential",
      "user:user-1:tokenMint",
      "user:user-1:destructive",
    ]);
    expect(memory.size()).toBe(1);
  });

  it("answers 429 from the shared store once the limit is reached", async () => {
    const shared = new MemorySharedRateLimitStore();
    const { ctx, reflector } = context("tokenMint");
    const interceptor = new UserRateLimitInterceptor(reflector, new RateLimitStore(), shared);
    for (let i = 0; i < 5; i++) await expect(run(interceptor, ctx)).resolves.toBe("ok");
    const err = await run(interceptor, ctx).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(HttpException);
    expect((err as HttpException).getStatus()).toBe(429);
  });

  it("logs a 429 with a keyed user reference, never the user id (S6)", async () => {
    const warn = vi.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
    const shared = new MemorySharedRateLimitStore();
    const { ctx, reflector } = context("tokenMint");
    const interceptor = new UserRateLimitInterceptor(reflector, new RateLimitStore(), shared);
    for (let i = 0; i < 5; i++) await run(interceptor, ctx);
    await run(interceptor, ctx).catch(() => undefined);
    const lines = warn.mock.calls.map((c) => String(c[0]));
    const line = lines.find((l) => l.startsWith("ratelimit_exceeded"));
    expect(line).toMatch(/userRef=[0-9a-f]{16}/);
    expect(lines.join("\n")).not.toContain("user-1");
  });

  it.each(["credential", "tokenMint", "destructive"] as const)(
    "fails closed for %s: a store error answers 503",
    async (cls) => {
      const { ctx, reflector } = context(cls);
      const interceptor = new UserRateLimitInterceptor(reflector, new RateLimitStore(), broken());
      await expect(run(interceptor, ctx)).rejects.toBeInstanceOf(ServiceUnavailableException);
    },
  );

  it.each(["bank", "bulkWrite", "dataExport"] as const)(
    "fails open for %s: a store error falls back to the in-memory counters",
    async (cls) => {
      const { ctx, reflector } = context(cls);
      const memory = new RateLimitStore();
      const interceptor = new UserRateLimitInterceptor(reflector, memory, broken());
      await expect(run(interceptor, ctx)).resolves.toBe("ok");
      expect(memory.size()).toBe(1);
    },
  );

  it.each(["bank", "bulkWrite", "dataExport"] as const)(
    "counts %s in the shared store, not in process memory",
    async (cls) => {
      const shared = new MemorySharedRateLimitStore();
      const hit = vi.spyOn(shared, "hit");
      const memory = new RateLimitStore();
      const { ctx, reflector } = context(cls);
      await run(new UserRateLimitInterceptor(reflector, memory, shared), ctx);
      expect(hit).toHaveBeenCalledTimes(1);
      expect(memory.size()).toBe(0);
    },
  );

  it("falls back to memory for every class when the table is missing (unmigrated dev schema)", async () => {
    const { ctx, reflector } = context("credential");
    const memory = new RateLimitStore();
    const interceptor = new UserRateLimitInterceptor(reflector, memory, broken("42P01"));
    await expect(run(interceptor, ctx)).resolves.toBe("ok");
    expect(memory.size()).toBe(2);
  });
});

describe("UserRateLimitInterceptor inviteRedeem (per user and per address)", () => {
  afterEach(() => vi.restoreAllMocks());

  /** A redeem request from `userId` at `ip`. */
  function redeemContext(userId: string, ip: string) {
    const req = { method: "POST", path: "/x", route: { path: "/x" }, user: { id: userId }, ip };
    const res = { setHeader: vi.fn() };
    const ctx = {
      getType: () => "http",
      getHandler: () => handler,
      getClass: () => class {},
      switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }),
    };
    const reflector = new Reflector();
    vi.spyOn(reflector, "getAllAndOverride").mockImplementation((key) =>
      key === RATE_LIMIT_CLASS ? "inviteRedeem" : undefined,
    );
    return { ctx: ctx as never, reflector };
  }

  it("counts both keys in the shared store and refuses the sixth try from one address", async () => {
    const shared = new MemorySharedRateLimitStore();
    const hit = vi.spyOn(shared, "hit");
    const memory = new RateLimitStore();
    // Five tries an hour: five different accounts from one address use the address up.
    for (let i = 1; i <= 5; i += 1) {
      const { ctx, reflector } = redeemContext(`user-${i}`, "203.0.113.7");
      await expect(run(new UserRateLimitInterceptor(reflector, memory, shared), ctx)).resolves.toBe(
        "ok",
      );
    }
    expect(hit.mock.calls.map((c) => c[0]).slice(0, 2)).toEqual([
      "user:user-1:inviteRedeem",
      "ip:203.0.113.7:inviteRedeem",
    ]);
    const { ctx, reflector } = redeemContext("user-6", "203.0.113.7");
    const err = await run(new UserRateLimitInterceptor(reflector, memory, shared), ctx).catch(
      (e) => e,
    );
    expect(err).toBeInstanceOf(HttpException);
    expect((err as HttpException).getStatus()).toBe(429);
    // Another address is unaffected.
    const other = redeemContext("user-6", "198.51.100.9");
    await expect(
      run(new UserRateLimitInterceptor(other.reflector, memory, shared), other.ctx),
    ).resolves.toBe("ok");
    // Nothing touched the in-memory store.
    expect(memory.size()).toBe(0);
  });

  it("fails closed with 503 when the shared store is down", async () => {
    vi.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
    const { ctx, reflector } = redeemContext("user-1", "203.0.113.7");
    const err = await run(
      new UserRateLimitInterceptor(reflector, new RateLimitStore(), broken()),
      ctx,
    ).catch((e) => e);
    expect(err).toBeInstanceOf(ServiceUnavailableException);
  });
});

describe("UserRateLimitInterceptor: which requests are counted", () => {
  type Req = { method: string; path?: string; url?: string; user?: { id?: unknown } };

  function setUp(req: Req, opts: { type?: string; skip?: boolean } = {}) {
    const res = { setHeader: vi.fn() };
    const ctx = {
      getType: () => opts.type ?? "http",
      getHandler: () => handler,
      getClass: () => class {},
      switchToHttp: () => ({
        getRequest: () => ({ route: { path: "/x" }, ...req }),
        getResponse: () => res,
      }),
    };
    const reflector = new Reflector();
    vi.spyOn(reflector, "getAllAndOverride").mockImplementation((key) =>
      key === RATE_LIMIT_SKIP ? opts.skip : undefined,
    );
    const memory = new RateLimitStore();
    const shared = new MemorySharedRateLimitStore();
    const interceptor = new UserRateLimitInterceptor(reflector, memory, shared);
    return { ctx: ctx as never, interceptor, memory };
  }

  beforeEach(() => {
    vi.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
  });
  afterEach(() => vi.restoreAllMocks());

  const user = { id: "user-1" };

  it("leaves a context that is not HTTP alone", async () => {
    const { ctx, interceptor, memory } = setUp(
      { method: "POST", path: "/x", user },
      { type: "rpc" },
    );
    await expect(run(interceptor, ctx)).resolves.toBe("ok");
    expect(memory.size()).toBe(0);
  });

  it("leaves a handler marked to skip rate limiting alone", async () => {
    const { ctx, interceptor, memory } = setUp(
      { method: "POST", path: "/x", user },
      { skip: true },
    );
    await expect(run(interceptor, ctx)).resolves.toBe("ok");
    expect(memory.size()).toBe(0);
  });

  it("leaves /mcp alone, reading the URL when there is no path", async () => {
    const { ctx, interceptor, memory } = setUp({ method: "POST", url: "/mcp", user });
    await expect(run(interceptor, ctx)).resolves.toBe("ok");
    expect(memory.size()).toBe(0);
  });

  it("leaves requests with no user, or an empty user id, to the IP guard", async () => {
    for (const req of [
      { method: "POST", path: "/x" },
      { method: "POST", path: "/x", user: { id: "" } },
    ]) {
      const { ctx, interceptor, memory } = setUp(req);
      await expect(run(interceptor, ctx)).resolves.toBe("ok");
      expect(memory.size()).toBe(0);
    }
  });

  it.each(["GET", "HEAD", "OPTIONS"])(
    "counts %s against the read limit (600 a minute), not the write limit (120)",
    async (method) => {
      const { ctx, interceptor } = setUp({ method, path: "/x", user });
      // 121 requests: over the write limit of 120, well under the read limit of 600.
      for (let i = 0; i < 121; i++) await expect(run(interceptor, ctx)).resolves.toBe("ok");
    },
  );

  it("counts POST against the write limit of 120 a minute", async () => {
    const { ctx, interceptor } = setUp({ method: "POST", path: "/x", user });
    for (let i = 0; i < 120; i++) await run(interceptor, ctx);
    // An in-memory class refuses as the interceptor is called, before any observable exists.
    let err: unknown;
    try {
      run(interceptor, ctx);
    } catch (e) {
      err = e;
    }
    expect((err as HttpException).getStatus()).toBe(429);
  });
});
