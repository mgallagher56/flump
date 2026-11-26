import { type ApiClient, BackendError, type BackendErrorKind } from "@flump/api-client";
import { createAccountCheck } from "./account";

const clientThat = (request: () => Promise<unknown>) =>
  ({ request: jest.fn(request), getClientPolicy: jest.fn() }) as unknown as ApiClient;

describe("createAccountCheck", () => {
  it("asks only for the status: the profile body is not parsed (version skew, PR #951)", async () => {
    const client = clientThat(async () => undefined);
    expect(await createAccountCheck(client)()).toBe("ok");
    expect(client.request).toHaveBeenCalledWith("/user-profile", {
      schema: null,
      allowEmpty: true,
    });
  });

  it.each<[BackendErrorKind, string]>([
    ["not-invited", "not-invited"],
    ["unauthorised", "unauthorised"],
    ["unavailable", "unavailable"],
    ["server", "unavailable"],
    ["forbidden", "unavailable"],
    ["bad-response", "out-of-step"],
  ])("a %s error is %s", async (kind, expected) => {
    const client = clientThat(async () => {
      throw new BackendError(kind, "/user-profile");
    });
    expect(await createAccountCheck(client)()).toBe(expected);
  });

  it("a 403 terms_not_accepted is terms-not-accepted (PR #939)", async () => {
    const client = clientThat(async () => {
      const error = new BackendError("forbidden", "/user-profile", 403);
      error.code = "terms_not_accepted";
      throw error;
    });
    expect(await createAccountCheck(client)()).toBe("terms-not-accepted");
  });

  it("anything that is not a backend error is unavailable", async () => {
    const client = clientThat(async () => {
      throw new TypeError("boom");
    });
    expect(await createAccountCheck(client)()).toBe("unavailable");
  });
});
