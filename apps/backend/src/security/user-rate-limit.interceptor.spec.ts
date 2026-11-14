import { HttpException, Logger, ServiceUnavailableException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { lastValueFrom, of } from "rxjs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RATE_LIMIT_CLASS, type RateLimitClass } from "./rate-limit.decorator";
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

  it("falls back to memory for every class when the table is missing (unmigrated dev schema)", async () => {
    const { ctx, reflector } = context("credential");
    const memory = new RateLimitStore();
    const interceptor = new UserRateLimitInterceptor(reflector, memory, broken("42P01"));
    await expect(run(interceptor, ctx)).resolves.toBe("ok");
    expect(memory.size()).toBe(2);
  });
});
