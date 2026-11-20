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

  describe("GET /app/beta", () => {
    // A local run with no beta variables unless a case sets them.
    const BASE = {
      NODE_ENV: "test",
      RAILWAY_ENVIRONMENT: "",
      BETA_ALLOWED_EMAILS: "",
      BETA_ALLOWED_USER_IDS: "",
      BETA_ADMIN_USER_IDS: "",
      BETA_OPEN: "",
    };
    const read = (env: Record<string, string>) => {
      for (const [key, value] of Object.entries({ ...BASE, ...env })) vi.stubEnv(key, value);
      try {
        const setHeader = vi.fn();
        const body = new AppController(new AppService(), bootConfig()).getBetaMode({
          setHeader,
        } as never);
        return { body, setHeader };
      } finally {
        vi.unstubAllEnvs();
      }
    };
    const EMAIL = ["invited", "example.test"].join("@");

    it("is open when no allowlist is set and BETA_OPEN=true, even with admins or in production", () => {
      expect(read({ BETA_OPEN: "true" }).body).toEqual({ inviteOnly: false });
      expect(
        read({ BETA_OPEN: "true", BETA_ADMIN_USER_IDS: "user_admin", NODE_ENV: "production" }).body,
      ).toEqual({ inviteOnly: false });
    });

    it("is open on a local run with no allowlist and no admin", () => {
      expect(read({}).body).toEqual({ inviteOnly: false });
    });

    it("is invite-only once an admin is set, or in a production-like process", () => {
      expect(read({ BETA_ADMIN_USER_IDS: "user_admin" }).body).toEqual({ inviteOnly: true });
      expect(read({ NODE_ENV: "production" }).body).toEqual({ inviteOnly: true });
      expect(read({ RAILWAY_ENVIRONMENT: "staging" }).body).toEqual({ inviteOnly: true });
    });

    it("an env allowlist makes it invite-only even with BETA_OPEN=true", () => {
      expect(read({ BETA_ALLOWED_USER_IDS: "user_a", BETA_OPEN: "true" }).body).toEqual({
        inviteOnly: true,
      });
    });

    it("is invite-only when an email list or a user id list is set", () => {
      expect(read({ BETA_ALLOWED_EMAILS: EMAIL, BETA_ALLOWED_USER_IDS: "" }).body).toEqual({
        inviteOnly: true,
      });
      expect(read({ BETA_ALLOWED_EMAILS: "", BETA_ALLOWED_USER_IDS: "user_a" }).body).toEqual({
        inviteOnly: true,
      });
    });

    it("returns one boolean and nothing from the lists, and is never cached", () => {
      const { body, setHeader } = read({
        BETA_ALLOWED_EMAILS: `${EMAIL}, other@example.test`,
        BETA_ALLOWED_USER_IDS: "user_a,user_b",
        BETA_ADMIN_USER_IDS: "user_admin",
      });
      expect(Object.keys(body)).toEqual(["inviteOnly"]);
      const text = JSON.stringify(body);
      for (const leak of ["@", "example", "user_", "2", "4"]) expect(text).not.toContain(leak);
      expect(setHeader).toHaveBeenCalledWith("Cache-Control", "no-store");
      // The only header it sets: never a cookie.
      expect(setHeader).toHaveBeenCalledTimes(1);
      expect(typeof body.inviteOnly).toBe("boolean");
    });
  });
});
