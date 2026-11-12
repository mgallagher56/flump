// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { loader } from "./robots[.]txt";

afterEach(() => vi.unstubAllEnvs());

describe("robots.txt loader", () => {
  it("disallows everything as text/plain", async () => {
    const res = loader();
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/plain");
    expect(await res.text()).toBe("User-agent: *\nDisallow: /\n");
    expect(res.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
  });

  it("allows everything and omits the header when ALLOW_INDEXING=true", async () => {
    vi.stubEnv("ALLOW_INDEXING", "true");
    const res = loader();
    expect(await res.text()).toBe("User-agent: *\nAllow: /\n");
    expect(res.headers.has("X-Robots-Tag")).toBe(false);
  });

  it.each(["1", "TRUE"])("stays disallow with the header for ALLOW_INDEXING=%s", async (value) => {
    vi.stubEnv("ALLOW_INDEXING", value);
    const res = loader();
    expect(await res.text()).toBe("User-agent: *\nDisallow: /\n");
    expect(res.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
  });
});
