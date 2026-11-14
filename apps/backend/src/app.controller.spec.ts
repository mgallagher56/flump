import { describe, expect, it, vi } from "vitest";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";

describe("AppController", () => {
  it('should return "Flump API is running."', () => {
    const appService = new AppService();
    const appController = new AppController(appService);
    expect(appController.getHello()).toBe("Flump API is running.");
  });

  it("serves the client policy from the environment, cacheable for five minutes", () => {
    const setHeader = vi.fn();
    const controller = new AppController(new AppService());
    vi.stubEnv("CLIENT_POLICY_IOS_MIN_VERSION", "1.3.0");
    try {
      expect(controller.getClientPolicy({ setHeader } as never)).toEqual({
        ios: { minVersion: "1.3.0", recommendedVersion: "0.0.0" },
        android: { minVersion: "0.0.0", recommendedVersion: "0.0.0" },
      });
      expect(setHeader).toHaveBeenCalledWith("Cache-Control", "public, max-age=300");
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
