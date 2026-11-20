import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { DataSource, type DataSourceOptions } from "typeorm";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { typeOrmOptionsFromEnv } from "../config/typeorm.options";
import { BetaMember } from "../entities/beta-member.entity";
import { AddBetaInvitesAndMembers1795590000000 } from "../migrations/AddBetaInvitesAndMembers1795590000000";
import { assertSafeTestDatabase } from "../testing/assertSafeTestDatabase";
import { resolveDbTestMode } from "../testing/dbTestMode";
import { discoverMigrations } from "../testing/discoverMigrations";
import { emptyEntityTables } from "../testing/emptyTables";
import { BetaInvitesService } from "./beta-invites.service";
import { BetaMembershipService } from "./beta-membership.service";

// Invite links on real Postgres: the single-use claim under a race, and every redeem outcome.
// Drops the public schema, so a throwaway database only:
//   docker run --rm -d --name flump-pg-test -e POSTGRES_PASSWORD=postgres \
//     -e POSTGRES_DB=flump_beta_test -p 55432:5432 postgres:18-alpine
//   TEST_DATABASE_URL=postgres://postgres:postgres@localhost:55432/flump_beta_test \
//     bunx vitest run src/beta
const ADMIN = ["user", "beta", "admin"].join("_");
const USER_1 = ["user", "beta", "one"].join("_");
const USER_2 = ["user", "beta", "two"].join("_");

describe.skipIf(resolveDbTestMode(process.env) === "skip")("beta invites (real Postgres)", () => {
  let ds: DataSource;
  let membership: BetaMembershipService;
  let invites: BetaInvitesService;
  const savedEnv = { ...process.env };

  beforeAll(async () => {
    const url = process.env.TEST_DATABASE_URL as string;
    assertSafeTestDatabase(url, process.env);
    const options = typeOrmOptionsFromEnv({ NODE_ENV: "test", DATABASE_URL: url });
    ds = new DataSource({
      ...(options as DataSourceOptions),
      migrations: await discoverMigrations(),
      synchronize: false,
      migrationsRun: false,
    });
    await ds.initialize();
    await ds.query("DROP SCHEMA public CASCADE");
    await ds.query("CREATE SCHEMA public");
    await ds.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await ds.runMigrations();
  }, 60_000);

  afterAll(async () => {
    process.env = { ...savedEnv };
    if (ds?.isInitialized) await ds.destroy();
  });

  beforeEach(async () => {
    await emptyEntityTables(ds);
    // Invite-only through the admin list alone, as in production with invite links.
    process.env = { ...savedEnv, NODE_ENV: "test", BETA_ADMIN_USER_IDS: ADMIN };
    for (const name of ["BETA_ALLOWED_EMAILS", "BETA_ALLOWED_USER_IDS", "BETA_OPEN"]) {
      delete process.env[name];
    }
    membership = new BetaMembershipService(ds.getRepository(BetaMember));
    invites = new BetaInvitesService(ds, membership);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const user = (id: string) => ({ id });
  const redeemStatus = (id: string, token: string) =>
    invites.redeem(user(id), token).then(
      (r) => r.status,
      (e: { getStatus?: () => number }) => e.getStatus?.() ?? "error",
    );

  it("two people racing for one link: exactly one joins, the other gets 410", async () => {
    for (let round = 0; round < 5; round += 1) {
      await emptyEntityTables(ds);
      const { token: raced } = await invites.createInvite(ADMIN);
      const outcomes = await Promise.all([
        redeemStatus(USER_1, raced),
        redeemStatus(USER_2, raced),
      ]);
      expect(outcomes.sort()).toEqual([410, "joined"]);
      const members = await ds.getRepository(BetaMember).find();
      expect(members).toHaveLength(1);
      const [row] = await ds.query(
        `SELECT redeemed_by_user_id FROM beta_invites WHERE redeemed_at IS NOT NULL`,
      );
      expect(row.redeemed_by_user_id).toBe(members[0]?.userId);
    }
  });

  it("joined, then already-member for a second link, which stays unused", async () => {
    const first = await invites.createInvite(ADMIN, "First");
    const second = await invites.createInvite(ADMIN);
    expect(await invites.redeem(user(USER_1), first.token)).toEqual({ status: "joined" });
    await expect(membership.isActiveMember(USER_1)).resolves.toBe(true);
    expect(await invites.redeem(user(USER_1), second.token)).toEqual({ status: "already-member" });
    const statuses = Object.fromEntries(
      (await invites.listInvites()).invites.map((i) => [i.id, i.status]),
    );
    expect(statuses).toEqual({ [first.id]: "used", [second.id]: "unused" });
    // The second link still works for someone else.
    expect(await invites.redeem(user(USER_2), second.token)).toEqual({ status: "joined" });
  });

  it("admins and env-listed callers are already members and never use a link up", async () => {
    const link = await invites.createInvite(ADMIN);
    expect(await invites.redeem(user(ADMIN), link.token)).toEqual({ status: "already-member" });
    process.env.BETA_ALLOWED_USER_IDS = USER_1;
    expect(await invites.redeem(user(USER_1), link.token)).toEqual({ status: "already-member" });
    const [row] = await ds.query(`SELECT redeemed_at FROM beta_invites WHERE id = $1`, [link.id]);
    expect(row.redeemed_at).toBeNull();
  });

  it("used, cancelled, expired and unknown links are one 410 with one body", async () => {
    const used = await invites.createInvite(ADMIN);
    const cancelled = await invites.createInvite(ADMIN);
    const expired = await invites.createInvite(ADMIN);
    await invites.redeem(user(USER_1), used.token);
    await invites.cancelInvite(cancelled.id);
    await ds.query(
      `UPDATE beta_invites SET expires_at = now() - interval '1 second' WHERE id = $1`,
      [expired.id],
    );
    const bodies: unknown[] = [];
    for (const token of [used.token, cancelled.token, expired.token, "q".repeat(43), "short"]) {
      const err = await invites.redeem(user(USER_2), token).catch((e) => e);
      expect(err.getStatus()).toBe(410);
      bodies.push(err.getResponse());
    }
    for (const body of bodies) {
      expect(body).toEqual({
        statusCode: 410,
        error: "invite_unusable",
        message: "This invite link cannot be used.",
      });
    }
    await expect(membership.isActiveMember(USER_2)).resolves.toBe(false);
  });

  it("a removed member is refused at once, and a new link re-activates the same row", async () => {
    const first = await invites.createInvite(ADMIN, "First");
    await invites.redeem(user(USER_1), first.token);
    expect(await invites.removeMember(USER_1)).toEqual({ success: true });
    await expect(membership.isActiveMember(USER_1)).resolves.toBe(false);
    expect(membership.wasActiveMemberRecently(USER_1)).toBe(false);
    await expect(invites.removeMember(USER_1)).rejects.toMatchObject({ status: 404 });

    const again = await invites.createInvite(ADMIN, "Again");
    expect(await invites.redeem(user(USER_1), again.token)).toEqual({ status: "joined" });
    const rows = await ds.getRepository(BetaMember).find();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ userId: USER_1, inviteId: again.id, removedAt: null });
    expect((await invites.listMembers()).members).toEqual([
      { userId: USER_1, label: "Again", addedAt: expect.any(String) },
    ]);
  });

  it("lists closed links for 30 days only, newest first, with the derived status", async () => {
    const recent = await invites.createInvite(ADMIN);
    const old = await invites.createInvite(ADMIN);
    await ds.query(
      `UPDATE beta_invites SET created_at = now() - interval '60 days',
         expires_at = now() - interval '31 days' WHERE id = $1`,
      [old.id],
    );
    const listed = (await invites.listInvites()).invites;
    expect(listed.map((i) => i.id)).toEqual([recent.id]);
    expect(listed[0]).toMatchObject({ status: "unused", usedAt: null });
    // Expired 29 days ago: still listed, as expired.
    await ds.query(
      `UPDATE beta_invites SET expires_at = now() - interval '29 days' WHERE id = $1`,
      [old.id],
    );
    const statuses = (await invites.listInvites()).invites.map((i) => [i.id, i.status]);
    expect(statuses).toEqual([
      [recent.id, "unused"],
      [old.id, "expired"],
    ]);
  });

  it("never logs a token, its hash or a label", async () => {
    const lines: string[] = [];
    const capture = (message: unknown) => {
      lines.push(typeof message === "string" ? message : JSON.stringify(message));
    };
    vi.spyOn(Logger.prototype, "log").mockImplementation(capture);
    vi.spyOn(Logger.prototype, "warn").mockImplementation(capture);
    vi.spyOn(Logger.prototype, "error").mockImplementation(capture);
    const label = "Private label";
    const link = await invites.createInvite(ADMIN, label);
    await invites.redeem(user(USER_1), link.token);
    await invites.redeem(user(USER_2), link.token).catch(() => undefined);
    await invites.removeMember(USER_1);
    const [{ token_hash: hash }] = await ds.query(`SELECT token_hash FROM beta_invites`);
    expect(lines.length).toBeGreaterThan(0);
    const all = lines.join("\n");
    for (const secret of [link.token, hash, label, USER_1, USER_2]) {
      expect(all).not.toContain(secret);
    }
    expect(all).toContain(link.id);
  });

  it("the migration's down() refuses while rows exist, then drops both tables; up() runs again", async () => {
    const migration = new AddBetaInvitesAndMembers1795590000000();
    const runner = ds.createQueryRunner();
    await runner.connect();
    const tables = async () =>
      (
        await runner.query(
          `SELECT table_name FROM information_schema.tables
           WHERE table_schema = 'public' AND table_name LIKE 'beta_%' ORDER BY table_name`,
        )
      ).map((r: { table_name: string }) => r.table_name);
    try {
      await invites.createInvite(ADMIN);
      await runner.startTransaction();
      await expect(migration.down(runner)).rejects.toThrow(/lock out every invited member/);
      await runner.rollbackTransaction();
      expect(await tables()).toEqual(["beta_invites", "beta_members"]);
      await emptyEntityTables(ds);
      await runner.startTransaction();
      await migration.down(runner);
      await runner.commitTransaction();
      expect(await tables()).toEqual([]);
      await runner.startTransaction();
      await migration.up(runner);
      await runner.commitTransaction();
      expect(await tables()).toEqual(["beta_invites", "beta_members"]);
    } finally {
      if (runner.isTransactionActive) await runner.rollbackTransaction();
      await runner.release();
    }
  });
});
