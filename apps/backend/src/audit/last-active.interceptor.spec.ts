import { of } from "rxjs";
import { describe, expect, it, vi } from "vitest";
import { LastActiveInterceptor } from "./last-active.interceptor";

const DAY = 24 * 60 * 60 * 1000;

function make(query = vi.fn().mockResolvedValue([])) {
  return { interceptor: new LastActiveInterceptor({ query } as never), query };
}

function http(user?: { id: string }) {
  return {
    getType: () => "http",
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as never;
}

describe("LastActiveInterceptor", () => {
  it("marks an authenticated user at most once a day", async () => {
    const { interceptor, query } = make();
    expect(await interceptor.touch("user_a", 0)).toBe(true);
    expect(await interceptor.touch("user_a", DAY - 1)).toBe(false);
    expect(await interceptor.touch("user_a", DAY)).toBe(true);
    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[0]?.[1]).toEqual(["user_a"]);
    expect(query.mock.calls[0]?.[0]).toMatch(/last_active_at" < now\(\) - interval '1 day'/);
  });

  it("skips unauthenticated requests and passes the response through", async () => {
    const { interceptor, query } = make();
    const next = { handle: () => of("body") };
    const out = await new Promise((resolve) =>
      interceptor.intercept(http(), next).subscribe(resolve),
    );
    expect(out).toBe("body");
    expect(query).not.toHaveBeenCalled();
  });

  it("never fails a request when the write fails, and retries five minutes later", async () => {
    const query = vi.fn().mockRejectedValueOnce(new Error("db down")).mockResolvedValue([]);
    const { interceptor } = make(query);
    const next = { handle: () => of("body") };
    await new Promise((resolve) =>
      interceptor.intercept(http({ id: "user_a" }), next).subscribe(resolve),
    );
    await new Promise((r) => setImmediate(r));
    expect(await interceptor.touch("user_a")).toBe(false);
    expect(await interceptor.touch("user_a", Date.now() + 5 * 60 * 1000 + 1)).toBe(true);
    expect(query).toHaveBeenCalledTimes(2);
  });
});
