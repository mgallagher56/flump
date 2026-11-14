import { Logger, ServiceUnavailableException } from "@nestjs/common";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InMemoryIdentityAdapter, WorkOSIdentityAdapter } from "../../identity/identity.adapter";
import { at } from "../../testing/must";
import { LoggingBankConsentRevoker } from "../banking/bank-consent-revoker";
import { AccountDeletionService } from "./account-deletion.service";
import { TOMBSTONE_KEY_ENV_VAR } from "./tombstone-key";
import { USER_DATA_REGISTRY } from "./user-data-registry";

/** A DataSource stand-in: every delete reports one row; one tombstone row is kept in memory. */
function fakeDataSource() {
  const deletes: string[] = [];
  let tombstone: { id: string; deletedAt: Date; identityDeletedAt: Date | null } | null = null;
  const auditInsert = vi.fn(async () => undefined);
  let pending: Date | null = null;
  const tombstoneRepo = {
    createQueryBuilder: () => {
      const qb = {
        insert: () => qb,
        values: (v: { deletedAt: Date }) => {
          pending = v.deletedAt;
          return qb;
        },
        orIgnore: () => qb,
        returning: () => qb,
        execute: async () => {
          // ON CONFLICT DO NOTHING: a retry keeps the first deletion time and returns no row.
          if (tombstone) return { raw: [] };
          tombstone = {
            id: "11111111-1111-4111-8111-111111111111",
            deletedAt: pending as Date,
            identityDeletedAt: null,
          };
          return { raw: [{ id: tombstone.id }] };
        },
      };
      return qb;
    },
    delete: vi.fn(async () => ({ affected: 0 })),
    findOneByOrFail: async () => ({ ...tombstone }),
    exists: async () => tombstone !== null,
    update: vi.fn(async (_where: unknown, patch: { identityDeletedAt: Date }) => {
      if (tombstone) tombstone.identityDeletedAt = patch.identityDeletedAt;
    }),
  };
  const repoFor = (entity: { name: string }) => {
    if (entity.name === "AccountDeletionTombstone") return tombstoneRepo;
    return {
      delete: async () => {
        deletes.push(entity.name);
        return { affected: 1 };
      },
      find: async () =>
        entity.name === "BankConnection"
          ? [{ id: "c1", institutionId: "monzo", authType: "oauth" }]
          : [],
      insert: entity.name === "AuditEvent" ? auditInsert : undefined,
    };
  };
  const ds = {
    transaction: vi.fn(async (cb: (m: unknown) => unknown) => cb({ getRepository: repoFor })),
    getRepository: repoFor,
  };
  return { ds, deletes, tombstoneRepo, auditInsert, current: () => tombstone };
}

describe("AccountDeletionService", () => {
  const saved = process.env[TOMBSTONE_KEY_ENV_VAR];
  const savedNodeEnv = process.env.NODE_ENV;
  let identity: InMemoryIdentityAdapter;
  let log: { mock: { calls: unknown[][] } };

  beforeEach(() => {
    process.env.NODE_ENV = "test";
    identity = new InMemoryIdentityAdapter();
    log = vi.spyOn(Logger.prototype, "log").mockImplementation(() => undefined);
    vi.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env.NODE_ENV = savedNodeEnv;
    if (saved === undefined) delete process.env[TOMBSTONE_KEY_ENV_VAR];
    else process.env[TOMBSTONE_KEY_ENV_VAR] = saved;
  });

  it("deletes every registry table in order, then the login, and logs counts only", async () => {
    const f = fakeDataSource();
    const revoker = new LoggingBankConsentRevoker();
    const revoke = vi.spyOn(revoker, "revokeAll");
    const service = new AccountDeletionService(f.ds as never, identity, revoker);

    await expect(service.deleteAccount("user_A")).resolves.toEqual({ status: "deleted" });

    // The sweep runs in the deletion transaction and once more after it commits.
    const order = USER_DATA_REGISTRY.map((t) => t.entity.name);
    expect(f.deletes).toEqual([...order, ...order]);
    expect(f.ds.transaction).toHaveBeenCalledTimes(2);
    expect(identity.deletedUsers).toEqual(["user_A"]);
    expect(revoke).toHaveBeenCalledWith("user_A", [
      { id: "c1", institutionId: "monzo", authType: "oauth" },
    ]);
    expect(f.current()?.identityDeletedAt).toBeInstanceOf(Date);
    expect(f.auditInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: null,
        action: "user.deleted",
        targetId: "11111111-1111-4111-8111-111111111111",
      }),
    );
    const events = log.mock.calls.map((call: unknown[]) => call[0] as Record<string, unknown>);
    const deleted = events.filter((e: Record<string, unknown>) => e?.event === "account_deleted");
    expect(deleted).toHaveLength(1);
    expect(Object.keys(at(deleted, 0)).sort()).toEqual(["event", "removed", "tombstoneId"]);
    expect(JSON.stringify(deleted[0])).not.toContain("user_A");
  });

  it("answers identity_pending when WorkOS fails, and a retry finishes the job", async () => {
    const f = fakeDataSource();
    const service = new AccountDeletionService(
      f.ds as never,
      identity,
      new LoggingBankConsentRevoker(),
    );
    identity.deleteFailure = new Error("WorkOS unavailable");
    await expect(service.deleteAccount("user_A")).resolves.toEqual({
      status: "identity_pending",
    });
    expect(f.current()?.identityDeletedAt).toBeNull();

    identity.deleteFailure = null;
    await expect(service.deleteAccount("user_A")).resolves.toEqual({ status: "deleted" });
    expect(identity.deletedUsers).toEqual(["user_A"]);

    // Once the login is gone, a further retry does not call WorkOS again.
    await expect(service.deleteAccount("user_A")).resolves.toEqual({ status: "deleted" });
    expect(identity.deletedUsers).toEqual(["user_A"]);

    // Only the first deletion is recorded; the retries find the earlier tombstone.
    expect(f.auditInsert).toHaveBeenCalledTimes(1);
  });

  it("fails closed with 503 when the tombstone key is missing in production", async () => {
    process.env.NODE_ENV = "production";
    delete process.env[TOMBSTONE_KEY_ENV_VAR];
    const f = fakeDataSource();
    const service = new AccountDeletionService(
      f.ds as never,
      identity,
      new LoggingBankConsentRevoker(),
    );
    await expect(service.deleteAccount("user_A")).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(f.ds.transaction).not.toHaveBeenCalled();
    expect(identity.deletedUsers).toEqual([]);
    await expect(service.isErased("user_A")).resolves.toBe(false);
  });

  it("isErased is true only after a deletion", async () => {
    const f = fakeDataSource();
    const service = new AccountDeletionService(
      f.ds as never,
      identity,
      new LoggingBankConsentRevoker(),
    );
    await expect(service.isErased("user_A")).resolves.toBe(false);
    await service.deleteAccount("user_A");
    await expect(service.isErased("user_A")).resolves.toBe(true);
  });
});

describe("LoggingBankConsentRevoker", () => {
  it("logs institutions and a count only, nothing for no connections", async () => {
    const warn = vi.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
    const revoker = new LoggingBankConsentRevoker();
    await revoker.revokeAll("user_A", []);
    expect(warn).not.toHaveBeenCalled();
    await revoker.revokeAll("user_A", [
      { id: "c1", institutionId: "monzo", authType: "oauth" },
      { id: "c2", institutionId: "monzo", authType: "oauth" },
    ]);
    const line = String(warn.mock.calls[0]?.[0]);
    expect(JSON.parse(line)).toEqual({
      event: "bank_consent_revoke_pending",
      connections: 2,
      institutions: ["monzo"],
    });
    expect(line).not.toContain("user_A");
    expect(line).not.toContain("c1");
    warn.mockRestore();
  });
});

describe("WorkOSIdentityAdapter.deleteUser", () => {
  const adapterWith = (deleteUser: (id: string) => Promise<void>) => {
    const adapter = new WorkOSIdentityAdapter({ get: () => undefined } as never);
    (adapter as unknown as { client: unknown }).client = { userManagement: { deleteUser } };
    return adapter;
  };

  it("treats a 404 as already deleted and rethrows anything else", async () => {
    const notFound = Object.assign(new Error("Not Found"), {
      status: 404,
      name: "NotFoundException",
    });
    await expect(adapterWith(async () => Promise.reject(notFound)).deleteUser("u")).resolves.toBe(
      undefined,
    );
    const boom = Object.assign(new Error("Server error"), { status: 500 });
    await expect(adapterWith(async () => Promise.reject(boom)).deleteUser("u")).rejects.toBe(boom);
  });

  it("throws when WorkOS is not configured, so the deletion stays pending", async () => {
    const adapter = new WorkOSIdentityAdapter({ get: () => undefined } as never);
    await expect(adapter.deleteUser("u")).rejects.toThrow("WorkOS client not configured");
  });
});
