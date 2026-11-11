import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@workos-inc/authkit-react-router", () => ({
  authkitLoader: vi.fn(),
}));

describe("auth.server startup check (runs when the server code loads)", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("throws at import when AUTH_DEV_BYPASS=true in production", async () => {
    vi.stubEnv("AUTH_DEV_BYPASS", "true");
    vi.stubEnv("NODE_ENV", "production");
    await expect(import("./auth.server")).rejects.toThrow("AUTH_DEV_BYPASS");
  });

  it("does not throw at import with a clean environment", async () => {
    vi.stubEnv("AUTH_DEV_BYPASS", "");
    await expect(import("./auth.server")).resolves.toBeDefined();
  });

  it("does not throw at import with the dev combination", async () => {
    vi.stubEnv("AUTH_DEV_BYPASS", "true");
    vi.stubEnv("NODE_ENV", "development");
    await expect(import("./auth.server")).resolves.toBeDefined();
  });
});
