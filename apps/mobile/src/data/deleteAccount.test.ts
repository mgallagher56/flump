import { BackendError } from "@flump/api-client";
import { createDeleteAccount, DELETE_TIMEOUT_MS } from "./deleteAccount";
import { fail, fakeApi } from "./fakeApi";

const failing = (status: number, kind: BackendError["kind"], code?: string) => () =>
  fail(kind, status, code);

describe("deleteAccount", () => {
  it("sends DELETE /user-profile with the typed phrase, and deleted is deleted", async () => {
    const api = fakeApi({ "DELETE /user-profile": () => ({ status: "deleted" }) });
    expect(await createDeleteAccount(api.client)()).toBe("deleted");
    expect(api.calls).toEqual([
      { method: "DELETE", path: "/user-profile", body: { confirmation: "DELETE" } },
    ]);
  });

  it("identity_pending is identityPending: the data is gone, the login not yet", async () => {
    const api = fakeApi({ "DELETE /user-profile": () => ({ status: "identity_pending" }) });
    expect(await createDeleteAccount(api.client)()).toBe("identityPending");
  });

  it.each([
    ["deleted", "deleted"],
    ["identity_pending", "identityPending"],
  ] as const)(
    "a newer backend's extra field does not stop %s counting",
    async (status, outcome) => {
      const api = fakeApi({
        "DELETE /user-profile": () => ({ status, deletedAt: "2026-11-27T10:00:00Z" }),
      });
      expect(await createDeleteAccount(api.client)()).toBe(outcome);
    },
  );

  it("an unknown status is failed, never deleted (a newer backend)", async () => {
    const api = fakeApi({ "DELETE /user-profile": () => ({ status: "scheduled" }) });
    expect(await createDeleteAccount(api.client)()).toBe("failed");
  });

  it.each([
    ["410 account_deleted", failing(410, "client", "account_deleted"), "accountDeleted"],
    [
      "403 recent_login_required",
      failing(403, "forbidden", "recent_login_required"),
      "recentLoginRequired",
    ],
    [
      "503 account_deletion_unavailable",
      failing(503, "server", "account_deletion_unavailable"),
      "unavailable",
    ],
    ["429", failing(429, "rate-limited"), "rateLimited"],
    // No answer in time, or the connection dropped: the request may or may not have landed.
    ["a time-out or lost connection", () => fail("unavailable"), "noAnswer"],
    ["a 403 with another code", failing(403, "forbidden", "terms_not_accepted"), "failed"],
    ["a 503 with another code", failing(503, "server", "service_unavailable"), "failed"],
    ["a 410 with another code", failing(410, "client", "gone"), "failed"],
    ["a 500", failing(500, "server"), "failed"],
    ["a 401 after the refresh", failing(401, "unauthorised"), "failed"],
    ["a bad body", failing(200, "bad-response"), "failed"],
  ] as const)("%s is %s", async (_name, route, outcome) => {
    const api = fakeApi({ "DELETE /user-profile": route });
    expect(await createDeleteAccount(api.client)()).toBe(outcome);
  });

  it("anything that is not a backend error is failed", async () => {
    const api = fakeApi({
      "DELETE /user-profile": () => {
        throw new TypeError("boom");
      },
    });
    expect(await createDeleteAccount(api.client)()).toBe("failed");
    expect(new BackendError("unavailable", "/x").kind).toBe("unavailable");
  });

  it("waits up to 30 seconds, as web's DELETE_TIMEOUT_MS", () => {
    expect(DELETE_TIMEOUT_MS).toBe(30_000);
  });
});
