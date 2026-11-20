import { BadRequestException, GoneException, Logger } from "@nestjs/common";
import type { DataSource } from "typeorm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BetaInvitesService } from "./beta-invites.service";

/**
 * Unit checks of the invite service with a fake data source (no database). The SQL itself, the
 * race between two redeemers and the 30-day list window are covered by
 * beta-invites.integration.spec.ts against Postgres.
 */

type Query = (sql: string, params?: unknown[]) => Promise<unknown>;

/** A fake data source whose `query` (top level and inside a transaction) is `answer`. */
function fakeDataSource(answer: Query) {
  const query = vi.fn(answer);
  const transaction = vi.fn(async (work: (m: { query: Query }) => Promise<unknown>) =>
    work({ query }),
  );
  return { ds: { query, transaction } as unknown as DataSource, query, transaction };
}

/** A token of the contract's shape: 43 base64url characters, built at runtime. */
const validToken = () => "t".repeat(43);

const caller = { id: "user_new" };

const original = { ...process.env };

/** Invite-only: an admin is set, no allowlist, not BETA_OPEN, a local (test) run. */
function inviteOnly() {
  process.env = { ...original, NODE_ENV: "test", BETA_ADMIN_USER_IDS: "user_admin" };
  for (const name of ["BETA_ALLOWED_EMAILS", "BETA_ALLOWED_USER_IDS", "BETA_OPEN"]) {
    delete process.env[name];
  }
}

beforeEach(() => {
  vi.spyOn(Logger.prototype, "log").mockImplementation(() => undefined);
  vi.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
});

afterEach(() => {
  process.env = { ...original };
  vi.restoreAllMocks();
});

/** The one 410 every unusable link gets, saying nothing of why. */
async function expectUnusable(promise: Promise<unknown>) {
  const err: unknown = await promise.catch((e) => e);
  expect(err).toBeInstanceOf(GoneException);
  expect((err as GoneException).getStatus()).toBe(410);
  expect((err as GoneException).getResponse()).toMatchObject({ error: "invite_unusable" });
}

describe("BetaInvitesService.redeem", () => {
  it("refuses a token of the wrong shape with the one 410, without opening a transaction", async () => {
    inviteOnly();
    const { ds, transaction } = fakeDataSource(async () => []);
    // 42 characters: one short of the contract's 43.
    await expectUnusable(new BetaInvitesService(ds).redeem(caller, "t".repeat(42)));
    expect(transaction).not.toHaveBeenCalled();
  });

  it("answers the one 410 when no unused link has the token (the UPDATE claims no row)", async () => {
    inviteOnly();
    const { ds } = fakeDataSource(async (sql) => {
      if (sql.startsWith("SELECT pg_advisory_xact_lock")) return [];
      if (sql.includes('FROM "beta_members"')) return []; // not a member yet
      // An UPDATE answers [rows, count]: here no row was claimed.
      if (sql.startsWith('UPDATE "beta_invites"')) return [[], 0];
      throw new Error(`unexpected query: ${sql}`);
    });
    await expectUnusable(new BetaInvitesService(ds).redeem(caller, validToken()));
  });

  it("joins the caller when the UPDATE claims the link, reading its id from [rows, count]", async () => {
    inviteOnly();
    const inserted: unknown[][] = [];
    const { ds } = fakeDataSource(async (sql, params) => {
      if (sql.startsWith("SELECT pg_advisory_xact_lock")) return [];
      if (sql.includes('FROM "beta_members"')) return [];
      if (sql.startsWith('UPDATE "beta_invites"')) return [[{ id: "invite-1" }], 1];
      if (sql.startsWith('INSERT INTO "beta_members"')) {
        inserted.push(params ?? []);
        return [];
      }
      throw new Error(`unexpected query: ${sql}`);
    });
    await expect(new BetaInvitesService(ds).redeem(caller, validToken())).resolves.toEqual({
      status: "joined",
    });
    // The member row is written for the caller, linked to the claimed invite.
    expect(inserted).toEqual([["user_new", "invite-1"]]);
  });
});

describe("BetaInvitesService.createInvite", () => {
  /** The INSERT answers one row, as RETURNING does. */
  const created = () =>
    fakeDataSource(async (_sql, params) => [
      {
        id: "invite-1",
        label: (params?.[1] as string | null) ?? null,
        created_at: new Date("2026-11-20T10:00:00Z"),
        expires_at: new Date("2026-12-04T10:00:00Z"),
      },
    ]);

  it("returns the link's times as ISO strings", async () => {
    const { ds } = created();
    const res = await new BetaInvitesService(ds).createInvite("user_admin", "Sam");
    // 10:00 UTC on 20 November, and 14 days later, written by toISOString with milliseconds.
    expect(res.createdAt).toBe("2026-11-20T10:00:00.000Z");
    expect(res.expiresAt).toBe("2026-12-04T10:00:00.000Z");
    expect(res.label).toBe("Sam");
  });

  it("accepts a label of 60 characters and refuses one of 61 with a 400", async () => {
    const { ds, query } = created();
    const service = new BetaInvitesService(ds);
    // The contract's limit, BETA_INVITE_LABEL_MAX, is 60 characters.
    await expect(service.createInvite("user_admin", "a".repeat(60))).resolves.toMatchObject({
      label: "a".repeat(60),
    });
    await expect(service.createInvite("user_admin", "a".repeat(61))).rejects.toBeInstanceOf(
      BadRequestException,
    );
    // Only the 60-character label reached the database.
    expect(query).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["a bell (control character)", "a\u0007b"],
    ["a zero-width space (invisible format character)", "a​b"],
    ["a line separator", "a b"],
  ])("refuses a label containing %s with a 400", async (_name, label) => {
    const { ds, query } = created();
    await expect(
      new BetaInvitesService(ds).createInvite("user_admin", label),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(query).not.toHaveBeenCalled();
  });
});
