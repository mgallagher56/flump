// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

describe("APP_VERSION", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("is dev when no version is injected", async () => {
    vi.stubEnv("VITE_APP_VERSION", "");
    vi.resetModules();
    const { APP_VERSION } = await import("./support");
    expect(APP_VERSION).toBe("dev");
  });

  it("is the injected build version when there is one", async () => {
    vi.stubEnv("VITE_APP_VERSION", "1.28.0");
    vi.resetModules();
    const { APP_VERSION } = await import("./support");
    expect(APP_VERSION).toBe("1.28.0");
  });
});
