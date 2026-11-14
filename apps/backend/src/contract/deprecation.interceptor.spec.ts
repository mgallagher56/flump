import { allRoutes } from "@flump/api-contract";
import { of } from "rxjs";
import { describe, expect, it, vi } from "vitest";
import { DeprecationInterceptor, successorPath } from "./deprecation.interceptor";

const ID = "6f1c1f3e-9d6e-4c0e-9f43-0a1b2c3d4e5f";

const run = (req: Record<string, unknown>) => {
  const headers: Record<string, string> = {};
  const res = { setHeader: (name: string, value: string) => (headers[name] = value) };
  const next = { handle: vi.fn(() => of("handled")) };
  const context = {
    getType: () => "http",
    switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }),
  };
  new DeprecationInterceptor().intercept(context as never, next);
  return { headers, next };
};

describe("DeprecationInterceptor", () => {
  it("marks a route alias deprecated and links the route that replaces it", () => {
    const sync = run({
      method: "POST",
      route: { path: "/bank-connections/:id/sync" },
      params: { id: ID },
    });
    expect(sync.headers).toEqual({
      Deprecation: "true",
      Link: `</v1/bank-connections/${ID}/refresh>; rel="successor-version"`,
    });
    expect(sync.next.handle).toHaveBeenCalledOnce();

    const put = run({ method: "PUT", route: { path: "/accounts/:id" }, params: { id: ID } });
    expect(put.headers.Link).toBe(`</v1/accounts/${ID}>; rel="successor-version"`);
  });

  it("leaves routes that are not aliases alone", () => {
    const { headers, next } = run({
      method: "PATCH",
      route: { path: "/accounts/:id" },
      params: { id: ID },
    });
    expect(headers).toEqual({});
    expect(next.handle).toHaveBeenCalledOnce();
  });

  it("never fails a request", () => {
    const { next } = run({ method: 7, route: null });
    expect(next.handle).toHaveBeenCalledOnce();
  });

  it("every alias names a route that exists", () => {
    for (const route of allRoutes.filter((r) => r.aliasOf)) {
      expect(
        allRoutes.some((r) => r.id === route.aliasOf),
        route.id,
      ).toBe(true);
    }
  });

  it("encodes params in the successor path", () => {
    const route = allRoutes.find((r) => r.id === "accounts.update");
    if (!route) throw new Error("missing route");
    expect(successorPath(route, { id: "a/b" })).toBe("/v1/accounts/a%2Fb");
  });
});
