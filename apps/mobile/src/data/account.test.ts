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
    // Nothing is parsed, so this is a body cut off mid-stream: a network failure.
    ["bad-response", "unavailable"],
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

  it("a 410 account_deleted is account-deleted, never unavailable (E12 S9)", async () => {
    const client = clientThat(async () => {
      const error = new BackendError("client", "/user-profile", 410);
      error.code = "account_deleted";
      throw error;
    });
    expect(await createAccountCheck(client)()).toBe("account-deleted");
  });

  it("a 410 with another code, or another status with that code, stays unavailable", async () => {
    for (const [status, code] of [
      [410, "gone"],
      [400, "account_deleted"],
    ] as const) {
      const client = clientThat(async () => {
        const error = new BackendError("client", "/user-profile", status);
        error.code = code;
        throw error;
      });
      expect(await createAccountCheck(client)()).toBe("unavailable");
    }
  });

  it("anything that is not a backend error is unavailable", async () => {
    const client = clientThat(async () => {
      throw new TypeError("boom");
    });
    expect(await createAccountCheck(client)()).toBe("unavailable");
  });
});
