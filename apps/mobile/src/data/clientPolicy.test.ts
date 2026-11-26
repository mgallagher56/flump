import { BackendError, type ClientPolicyResult } from "@flump/api-client";
import { createUpdateCheck } from "./clientPolicy";

const apiAnswering = (answer: () => Promise<ClientPolicyResult>) => ({
  getClientPolicy: jest.fn(answer),
});
const policy = (minVersion: string): ClientPolicyResult => ({
  ok: true,
  policy: { minVersion, recommendedVersion: minVersion },
});

describe("createUpdateCheck", () => {
  it.each([
    // Version, minimum, update required: each comparison on its edge.
    ["1.2.2", "1.2.3", true],
    ["1.2.3", "1.2.3", false],
    ["1.2.4", "1.2.3", false],
    ["0.0.0", "0.0.0", false],
    ["0.9.9", "1.0.0", true],
  ])("version %s against minimum %s: %s", async (version, min, required) => {
    const api = apiAnswering(async () => policy(min));
    expect(await createUpdateCheck(api, version)()).toBe(required);
    expect(api.getClientPolicy).toHaveBeenCalledTimes(1);
  });

  it("fails open when the server cannot answer", async () => {
    const api = apiAnswering(async () => ({
      ok: false,
      error: new BackendError("unavailable", "/app/client-policy"),
    }));
    expect(await createUpdateCheck(api, "0.0.1")()).toBe(false);
  });

  it("fails open when the call throws", async () => {
    const api = apiAnswering(async () => {
      throw new TypeError("boom");
    });
    expect(await createUpdateCheck(api, "0.0.1")()).toBe(false);
  });
});
