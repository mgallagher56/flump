import { ConfigService } from "@nestjs/config";
import { afterEach, describe, expect, it, vi } from "vitest";
import { InMemoryIdentityAdapter, WorkOSIdentityAdapter } from "./identity.adapter";

// A placeholder key shape, built at runtime; the client is never contacted (calls are stubbed).
const placeholderKey = ["sk", "test", "placeholder"].join("_");
const sampleSession = ["session", "sample", "1"].join("_");

const withClient = () => {
  const adapter = new WorkOSIdentityAdapter(new ConfigService({ WORKOS_API_KEY: placeholderKey }));
  const client = (adapter as unknown as { client: { userManagement: { revokeSession: unknown } } })
    .client;
  const revoke = vi.fn<(payload: { sessionId: string }) => Promise<void>>();
  client.userManagement.revokeSession = revoke;
  return { adapter, revoke };
};

describe("WorkOSIdentityAdapter.revokeSession", () => {
  afterEach(() => vi.restoreAllMocks());

  it("asks WorkOS to revoke exactly the given session", async () => {
    const { adapter, revoke } = withClient();
    revoke.mockResolvedValue(undefined);
    await expect(adapter.revokeSession(sampleSession)).resolves.toBeUndefined();
    expect(revoke).toHaveBeenCalledTimes(1);
    expect(revoke).toHaveBeenCalledWith({ sessionId: sampleSession });
  });

  it("treats a 404 or a NotFoundException as already done", async () => {
    const { adapter, revoke } = withClient();
    revoke.mockRejectedValueOnce(Object.assign(new Error("Not Found"), { status: 404 }));
    await expect(adapter.revokeSession(sampleSession)).resolves.toBeUndefined();
    const notFound = new Error("Session not found");
    notFound.name = "NotFoundException";
    revoke.mockRejectedValueOnce(notFound);
    await expect(adapter.revokeSession(sampleSession)).resolves.toBeUndefined();
  });

  it("rethrows any other failure, a 400 or 500 included", async () => {
    const { adapter, revoke } = withClient();
    const bad = Object.assign(new Error("Bad Request"), { status: 400 });
    revoke.mockRejectedValueOnce(bad);
    await expect(adapter.revokeSession(sampleSession)).rejects.toBe(bad);
    const down = Object.assign(new Error("Server Error"), { status: 500 });
    revoke.mockRejectedValueOnce(down);
    await expect(adapter.revokeSession(sampleSession)).rejects.toBe(down);
  });

  it("throws when no WorkOS client is configured, like deleteUser", async () => {
    const adapter = new WorkOSIdentityAdapter(new ConfigService({}));
    await expect(adapter.revokeSession(sampleSession)).rejects.toThrow(
      "WorkOS client not configured",
    );
  });
});

describe("InMemoryIdentityAdapter.revokeSession", () => {
  it("records the session, or throws the set failure", async () => {
    const fake = new InMemoryIdentityAdapter();
    await fake.revokeSession(sampleSession);
    expect(fake.revokedSessions).toEqual([sampleSession]);
    fake.revokeFailure = new Error("outage");
    await expect(fake.revokeSession("other")).rejects.toThrow("outage");
    expect(fake.revokedSessions).toEqual([sampleSession]);
  });
});
