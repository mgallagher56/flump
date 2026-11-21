// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

describe("server env defaults", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("defaults NODE_ENV to production when it is unset", async () => {
    vi.stubEnv("NODE_ENV", undefined);
    vi.resetModules();
    await import("./env");
    expect(process.env.NODE_ENV).toBe("production");
  });

  it("keeps a NODE_ENV that is already set", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.resetModules();
    await import("./env");
    expect(process.env.NODE_ENV).toBe("development");
  });
});
