import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("config.server startup check (runs when the server code loads)", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("throws at import in production without VITE_API_URL", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VITE_API_URL", "");
    await expect(import("./config.server")).rejects.toThrow("VITE_API_URL");
  });

  it("does not throw at import with a clean development environment", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("VITE_API_URL", "");
    const mod = await import("./config.server");
    expect(mod.apiConfig.apiBaseUrl).toBe("http://localhost:4000");
  });
});
