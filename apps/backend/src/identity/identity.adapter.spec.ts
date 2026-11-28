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

describe("WorkOSIdentityAdapter.getUserEmail", () => {
  afterEach(() => vi.restoreAllMocks());

  const withGetUser = () => {
    const adapter = new WorkOSIdentityAdapter(
      new ConfigService({ WORKOS_API_KEY: placeholderKey }),
    );
    const client = (adapter as unknown as { client: { userManagement: { getUser: unknown } } })
      .client;
    const getUser = vi.fn<(userId: string) => Promise<{ email?: string | null } | null>>();
    client.userManagement.getUser = getUser;
    return { adapter, getUser };
  };

  it("returns the user email from WorkOS", async () => {
    const { adapter, getUser } = withGetUser();
    const sampleEmail = ["person", "example.com"].join("@");
    getUser.mockResolvedValue({ email: sampleEmail });
    await expect(adapter.getUserEmail("user_1")).resolves.toBe(sampleEmail);
    expect(getUser).toHaveBeenCalledTimes(1);
    expect(getUser).toHaveBeenCalledWith("user_1");
  });

  it("returns null when the user has no email or WorkOS returns null", async () => {
    const { adapter, getUser } = withGetUser();
    getUser.mockResolvedValueOnce({ email: null });
    await expect(adapter.getUserEmail("user_1")).resolves.toBeNull();
    getUser.mockResolvedValueOnce(null);
    await expect(adapter.getUserEmail("user_1")).resolves.toBeNull();
  });

  it("returns null when WorkOS answers 404 or NotFoundException", async () => {
    const { adapter, getUser } = withGetUser();
    getUser.mockRejectedValueOnce(Object.assign(new Error("Not Found"), { status: 404 }));
    await expect(adapter.getUserEmail("user_missing")).resolves.toBeNull();
    const notFound = new Error("User not found");
    notFound.name = "NotFoundException";
    getUser.mockRejectedValueOnce(notFound);
    await expect(adapter.getUserEmail("user_missing")).resolves.toBeNull();
  });

  it("returns null when no WorkOS client is configured", async () => {
    const adapter = new WorkOSIdentityAdapter(new ConfigService({}));
    await expect(adapter.getUserEmail("user_1")).resolves.toBeNull();
  });

  it("rethrows non-404 errors", async () => {
    const { adapter, getUser } = withGetUser();
    const outage = Object.assign(new Error("Server Error"), { status: 500 });
    getUser.mockRejectedValueOnce(outage);
    await expect(adapter.getUserEmail("user_1")).rejects.toBe(outage);
  });
});

describe("WorkOSIdentityAdapter.getUserContact", () => {
  afterEach(() => vi.restoreAllMocks());

  type Person = { email?: string | null; firstName?: string | null; lastName?: string | null };
  const withGetUser = () => {
    const adapter = new WorkOSIdentityAdapter(
      new ConfigService({ WORKOS_API_KEY: placeholderKey }),
    );
    const client = (adapter as unknown as { client: { userManagement: { getUser: unknown } } })
      .client;
    const getUser = vi.fn<(userId: string) => Promise<Person | null>>();
    client.userManagement.getUser = getUser;
    return { adapter, getUser };
  };
  const sampleEmail = ["person", "example.com"].join("@");

  it("returns the email and the first and last name joined", async () => {
    const { adapter, getUser } = withGetUser();
    getUser.mockResolvedValue({ email: sampleEmail, firstName: "Ada", lastName: "Lovelace" });
    await expect(adapter.getUserContact("user_1")).resolves.toEqual({
      email: sampleEmail,
      name: "Ada Lovelace",
    });
    expect(getUser).toHaveBeenCalledWith("user_1");
  });

  it("gives a null name when WorkOS has none, and null when there is no email", async () => {
    const { adapter, getUser } = withGetUser();
    getUser.mockResolvedValueOnce({ email: sampleEmail, firstName: null, lastName: "" });
    await expect(adapter.getUserContact("user_1")).resolves.toEqual({
      email: sampleEmail,
      name: null,
    });
    getUser.mockResolvedValueOnce({ email: null, firstName: "Ada" });
    await expect(adapter.getUserContact("user_1")).resolves.toBeNull();
  });

  it("returns null for an unknown user (404 or NotFoundException), as for an erased account", async () => {
    const { adapter, getUser } = withGetUser();
    getUser.mockRejectedValueOnce(Object.assign(new Error("Not Found"), { status: 404 }));
    await expect(adapter.getUserContact("user_gone")).resolves.toBeNull();
    const notFound = new Error("User not found");
    notFound.name = "NotFoundException";
    getUser.mockRejectedValueOnce(notFound);
    await expect(adapter.getUserContact("user_gone")).resolves.toBeNull();
  });

  it("throws on an outage rather than reading it as unknown", async () => {
    const { adapter, getUser } = withGetUser();
    getUser.mockRejectedValueOnce(Object.assign(new Error("Bad Gateway"), { status: 502 }));
    await expect(adapter.getUserContact("user_1")).rejects.toThrow("Bad Gateway");
  });

  it("returns null when no WorkOS client is configured", async () => {
    const adapter = new WorkOSIdentityAdapter(new ConfigService({}));
    await expect(adapter.getUserContact("user_1")).resolves.toBeNull();
  });
});
