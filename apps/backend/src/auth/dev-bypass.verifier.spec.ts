import { describe, expect, it } from "vitest";
import { DEV_BYPASS_TOKEN, DEV_USER, DevBypassVerifier } from "./dev-bypass.verifier";

describe("DevBypassVerifier", () => {
  it("resolves the dev user for the bypass token", async () => {
    await expect(new DevBypassVerifier().verify(DEV_BYPASS_TOKEN)).resolves.toEqual(DEV_USER);
    expect(DEV_USER.id).toBe("dev_user_123");
  });

  it("rejects any other token", async () => {
    await expect(new DevBypassVerifier().verify("something-else")).rejects.toThrow();
    await expect(new DevBypassVerifier().verify("")).rejects.toThrow();
  });
});
