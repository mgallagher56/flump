// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { loadRootProfile } from "./root-profile.server";

describe("loadRootProfile", () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("leaves no unhandled rejection when a failed read is never awaited", async () => {
    globalThis.fetch = vi.fn(
      async () => new Response("", { status: 404 }),
    ) as unknown as typeof fetch;
    const unhandled = vi.fn();
    process.on("unhandledRejection", unhandled);
    try {
      void loadRootProfile({}, "t");
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(unhandled).not.toHaveBeenCalled();
    } finally {
      process.off("unhandledRejection", unhandled);
    }
  });

  it("shares one read per request context and the failure with it", async () => {
    const fetchMock = vi.fn(async () => new Response("", { status: 404 }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const context = {};
    const first = loadRootProfile(context, "t");
    expect(loadRootProfile(context, "t")).toBe(first);
    await expect(first).rejects.toMatchObject({ kind: "not-found" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
