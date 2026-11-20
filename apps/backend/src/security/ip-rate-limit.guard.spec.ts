import { type ExecutionContext, HttpException, HttpStatus, Logger } from "@nestjs/common";
import type { Reflector } from "@nestjs/core";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { IpRateLimitGuard } from "./ip-rate-limit.guard";
import type { RateLimitStore } from "./rate-limit.store";

function make(allowed: boolean) {
  const hit = vi.fn(() => ({ allowed, retryAfterSeconds: 30 }));
  const reflector = { getAllAndOverride: vi.fn(() => undefined) } as unknown as Reflector;
  const guard = new IpRateLimitGuard(reflector, { hit } as unknown as RateLimitStore);
  return { guard, hit };
}

describe("IpRateLimitGuard", () => {
  beforeAll(() => {
    Logger.overrideLogger(false);
  });

  it("lets a non-HTTP context through without counting it against any address", () => {
    const { guard, hit } = make(false);
    const rpc = { getType: () => "rpc" } as unknown as ExecutionContext;
    // The limiter is for HTTP requests only: a queue or RPC context has no client address.
    expect(guard.canActivate(rpc)).toBe(true);
    expect(hit).not.toHaveBeenCalled();
  });

  it("answers 429 for an over-limit request even when no route was matched", () => {
    const { guard } = make(false);
    const setHeader = vi.fn();
    const req = {
      path: "/accounts",
      url: "/accounts",
      method: "GET",
      headers: {},
      ip: "203.0.113.9",
    };
    const http = {
      getType: () => "http",
      getHandler: () => undefined,
      getClass: () => undefined,
      switchToHttp: () => ({ getRequest: () => req, getResponse: () => ({ setHeader }) }),
    } as unknown as ExecutionContext;
    let thrown: unknown;
    try {
      guard.canActivate(http);
    } catch (e) {
      thrown = e;
    }
    // A request with no route template (req.route unset) is still refused with 429 and the
    // store's 30-second Retry-After, not a 500 from reading a missing route.
    expect(thrown).toBeInstanceOf(HttpException);
    expect((thrown as HttpException).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    expect(setHeader).toHaveBeenCalledWith("Retry-After", "30");
  });
});
