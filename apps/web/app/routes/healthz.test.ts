// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { loader } from "./healthz";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("healthz loader", () => {
  it("returns 200 JSON ok without calling fetch", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const res = loader();
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("application/json");
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(await res.json()).toEqual({ status: "ok" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("sends noindex by default", () => {
    vi.stubEnv("ALLOW_INDEXING", "");
    expect(loader().headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
  });

  it("omits noindex when ALLOW_INDEXING=true", () => {
    vi.stubEnv("ALLOW_INDEXING", "true");
    expect(loader().headers.has("X-Robots-Tag")).toBe(false);
  });

  it.each(["1", "TRUE"])("keeps noindex for ALLOW_INDEXING=%s", (value) => {
    vi.stubEnv("ALLOW_INDEXING", value);
    expect(loader().headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
  });
});
