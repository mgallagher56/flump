// @vitest-environment node
import type { Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { rateLimit } from "./rateLimit";

function run(handler: ReturnType<typeof rateLimit>, ip: string | undefined) {
  const res = {
    status: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    type: vi.fn().mockReturnThis(),
    end: vi.fn().mockReturnThis(),
  };
  const next = vi.fn();
  handler({ ip } as Request, res as unknown as Response, next);
  return { res, next };
}

describe("rateLimit", () => {
  it("allows up to max requests then answers 429 with Retry-After", () => {
    const h = rateLimit({ windowMs: 60_000, max: 2, now: () => 0 });
    expect(run(h, "1.1.1.1").next).toHaveBeenCalled();
    expect(run(h, "1.1.1.1").next).toHaveBeenCalled();
    const blocked = run(h, "1.1.1.1");
    expect(blocked.next).not.toHaveBeenCalled();
    expect(blocked.res.status).toHaveBeenCalledWith(429);
    expect(blocked.res.set).toHaveBeenCalledWith("Retry-After", "60");
  });

  it("tracks clients independently", () => {
    const h = rateLimit({ windowMs: 60_000, max: 1, now: () => 0 });
    run(h, "1.1.1.1");
    expect(run(h, "2.2.2.2").next).toHaveBeenCalled();
  });

  it("resets after the window", () => {
    let t = 0;
    const h = rateLimit({ windowMs: 1000, max: 1, now: () => t });
    run(h, "1.1.1.1");
    expect(run(h, "1.1.1.1").next).not.toHaveBeenCalled();
    t = 1001;
    expect(run(h, "1.1.1.1").next).toHaveBeenCalled();
  });

  it("bounds the tracked client count", () => {
    const h = rateLimit({ windowMs: 60_000, max: 1, now: () => 0, maxClients: 2 });
    run(h, "a");
    run(h, "b");
    expect(run(h, "c").next).toHaveBeenCalled();
    // table was cleared to make room, so a is allowed again rather than memory growing
    expect(run(h, "a").next).toHaveBeenCalled();
  });
});
