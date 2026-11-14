import { describe, expect, it } from "vitest";
import { DEV_BYPASS_TOKEN, DEV_USER, DevBypassVerifier } from "./dev-bypass.verifier";

describe("DevBypassVerifier", () => {
  it("resolves the dev user for the bypass token", async () => {
    const user = await new DevBypassVerifier().verify(DEV_BYPASS_TOKEN);
    expect(user).toMatchObject(DEV_USER);
    expect(DEV_USER.id).toBe("dev_user_123");
    // Counts as just signed in, so the recent-login check does not block local development.
    expect(Math.abs((user.authTime ?? 0) - Date.now() / 1000)).toBeLessThan(5);
  });

  it("rejects any other token", async () => {
    await expect(new DevBypassVerifier().verify("something-else")).rejects.toThrow();
    await expect(new DevBypassVerifier().verify("")).rejects.toThrow();
  });
});
