import { ClientPolicyResponse } from "@flump/api-contract";
import { describe, expect, it } from "vitest";
import { NO_MINIMUM_VERSION, readClientPolicy } from "./client-policy.config";

describe("readClientPolicy", () => {
  it("defaults to no minimum on both platforms", () => {
    const none = { minVersion: NO_MINIMUM_VERSION, recommendedVersion: NO_MINIMUM_VERSION };
    expect(readClientPolicy({})).toEqual({ ios: none, android: none });
  });

  it("reads each platform's versions from the environment", () => {
    const policy = readClientPolicy({
      CLIENT_POLICY_IOS_MIN_VERSION: "1.2.0",
      CLIENT_POLICY_IOS_RECOMMENDED_VERSION: " v1.4 ",
      CLIENT_POLICY_ANDROID_MIN_VERSION: "2.0.1",
    });
    expect(policy).toEqual({
      ios: { minVersion: "1.2.0", recommendedVersion: "1.4" },
      android: { minVersion: "2.0.1", recommendedVersion: NO_MINIMUM_VERSION },
    });
  });

  it.each(["", "latest", "1.2.3.4", "1.x", "1.2.3-beta", "999999.0.0", "<script>"])(
    "falls back to no minimum for the malformed value %j",
    (value) => {
      const policy = readClientPolicy({ CLIENT_POLICY_IOS_MIN_VERSION: value });
      expect(policy.ios.minVersion).toBe(NO_MINIMUM_VERSION);
    },
  );

  it("always matches the contract", () => {
    for (const env of [{}, { CLIENT_POLICY_ANDROID_RECOMMENDED_VERSION: "3" }]) {
      expect(ClientPolicyResponse.safeParse(readClientPolicy(env)).success).toBe(true);
    }
  });
});
