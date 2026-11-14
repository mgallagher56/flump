import { describe, expect, it, vi } from "vitest";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { readClientPolicy } from "./config/client-policy.config";
import type { BootConfig } from "./config/config.module";

const bootConfig = (env: Record<string, string | undefined> = {}): BootConfig => ({
  db: {} as BootConfig["db"],
  clientPolicy: readClientPolicy(env),
  privacyWarnings: [],
});

describe("AppController", () => {
  it('should return "Flump API is running."', () => {
    const appController = new AppController(new AppService(), bootConfig());
    expect(appController.getHello()).toBe("Flump API is running.");
  });

  it("serves the client policy resolved at boot, cacheable for five minutes", () => {
    const setHeader = vi.fn();
    const controller = new AppController(
      new AppService(),
      bootConfig({ CLIENT_POLICY_IOS_MIN_VERSION: "1.3.0" }),
    );
    expect(controller.getClientPolicy({ setHeader } as never)).toEqual({
      ios: { minVersion: "1.3.0", recommendedVersion: "0.0.0" },
      android: { minVersion: "0.0.0", recommendedVersion: "0.0.0" },
    });
    expect(setHeader).toHaveBeenCalledWith("Cache-Control", "public, max-age=300");
  });

  it("does not read process.env per request (N11)", () => {
    const controller = new AppController(new AppService(), bootConfig());
    vi.stubEnv("CLIENT_POLICY_IOS_MIN_VERSION", "9.0.0");
    try {
      expect(controller.getClientPolicy({ setHeader: vi.fn() } as never).ios.minVersion).toBe(
        "0.0.0",
      );
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
