import { type ApiClient, BackendError, type BackendErrorKind } from "@flump/api-client";
import { createAccountCheck } from "./account";

const clientThat = (request: () => Promise<unknown>) =>
  ({ request: jest.fn(request), getClientPolicy: jest.fn() }) as unknown as ApiClient;

describe("createAccountCheck", () => {
  it("reads the profile with the contract schema and reports ok", async () => {
    const client = clientThat(async () => ({}));
    expect(await createAccountCheck(client)()).toBe("ok");
    expect(client.request).toHaveBeenCalledWith(
      "/user-profile",
      expect.objectContaining({ schema: expect.anything() }),
    );
  });

  it.each<[BackendErrorKind, string]>([
    ["not-invited", "not-invited"],
    ["unauthorised", "unauthorised"],
    ["unavailable", "unavailable"],
    ["server", "unavailable"],
    ["forbidden", "unavailable"],
    ["bad-response", "unavailable"],
  ])("a %s error is %s", async (kind, expected) => {
    const client = clientThat(async () => {
      throw new BackendError(kind, "/user-profile");
    });
    expect(await createAccountCheck(client)()).toBe(expected);
  });

  it("anything that is not a backend error is unavailable", async () => {
    const client = clientThat(async () => {
      throw new TypeError("boom");
    });
    expect(await createAccountCheck(client)()).toBe("unavailable");
  });
});
