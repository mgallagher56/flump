import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@workos-inc/authkit-react-router", () => ({
  authkitLoader: vi.fn(),
}));

describe("session.server startup auth check", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("SESSION_SECRET", "test-secret");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("throws at import when AUTH_DEV_BYPASS=true in production", async () => {
    vi.stubEnv("AUTH_DEV_BYPASS", "true");
    vi.stubEnv("NODE_ENV", "production");
    await expect(import("./session.server")).rejects.toThrow("AUTH_DEV_BYPASS");
  });

  it("does not throw at import with a clean environment", async () => {
    vi.stubEnv("AUTH_DEV_BYPASS", "");
    await expect(import("./session.server")).resolves.toBeDefined();
  });
});
