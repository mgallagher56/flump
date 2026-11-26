import "reflect-metadata";
import { createHash, randomBytes } from "node:crypto";
import { HOUSEHOLD_INVITATION_TTL_HOURS } from "@flump/api-contract";
import { Logger } from "@nestjs/common";
import request from "supertest";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Account } from "../../src/entities/account.entity";
import { UserProfile } from "../../src/entities/user-profile.entity";
import { HouseholdService } from "../../src/modules/household/household.service";
import { resolveDbTestMode } from "../../src/testing/dbTestMode";
import { ROUTE_MATRIX } from "./matrix";
import {
  type AuthzHarness,
  bootAuthzHarness,
  expectProbeRejected,
  type HttpMethod,
  sansRequestId,
  truncateAll,
  USER_A,
  USER_B,
} from "./support";

// Migrations run on boot; see support.ts.
vi.mock("../../src/config/typeorm.options", async (importOriginal) =>
  (await import("./support.js")).withMigrations(await importOriginal()),
);

/**
 * Households (E34 C3), real AppModule on real Postgres, booted as main.ts boots (the /v1 alias,
 * the security middleware). With the household switch off every household route, signed in or
 * not, answers exactly like a route that does not exist. With it on: the invitation link's life
 * (hashed, single use, 48 hours, bound to the account that accepts it, strictly rate limited), the
 * G1 to G10 requirements of docs/audit/plans/E34-shared-finances-research.md, and MCP unchanged.
 */
const dbMode = resolveDbTestMode(process.env);

interface RouteCase {
  key: string;
  method: HttpMethod;
  path: string;
  body?: object;
}

/** A token no link has: 32 random bytes, base64url, built at run time. */
const unknownToken = () => randomBytes(32).toString("base64url");

const ROUTES: RouteCase[] = [
  { key: "GET /household", method: "get", path: "/household" },
  { key: "POST /household/invitations", method: "post", path: "/household/invitations", body: {} },
  { key: "DELETE /household/invitations", method: "delete", path: "/household/invitations" },
  {
    key: "POST /household/invitations/preview",
    method: "post",
    path: "/household/invitations/preview",
    body: { token: unknownToken() },
  },
  {
    key: "POST /household/invitations/accept",
    method: "post",
    path: "/household/invitations/accept",
    body: { token: unknownToken() },
  },
  {
    key: "POST /household/sharing",
    method: "post",
    path: "/household/sharing",
    body: { sharesJointSummary: true },
  },
  { key: "POST /household/leave", method: "post", path: "/household/leave", body: {} },
  { key: "GET /household/joint-summary", method: "get", path: "/household/joint-summary" },
];

/** Headers that differ per request (ids, timing) and so are not compared. */
const PER_REQUEST_HEADERS = new Set(["x-request-id", "date", "etag", "content-length"]);

describe.skipIf(dbMode === "skip")("authz: households (real Postgres)", () => {
  let h: AuthzHarness;
  const exercised = new Set<string>();
  const ran = (key: string, kind: "authn" | "idor" = "idor") => exercised.add(`${key}:${kind}`);
  const savedSwitch = process.env.HOUSEHOLD_ENABLED;
  const on = () => {
    process.env.HOUSEHOLD_ENABLED = "true";
  };
  const off = () => {
    delete process.env.HOUSEHOLD_ENABLED;
  };

  beforeAll(async () => {
    h = await bootAuthzHarness({ likeMain: true });
  }, 60_000);

  afterAll(async () => {
    const expected = Object.entries(ROUTE_MATRIX)
      .filter(([, row]) => row.status === "covered" && row.spec === "household")
      .flatMap(([key]) => [`${key}:authn`, `${key}:idor`])
      .sort();
    expect([...exercised].sort()).toEqual(expected);
    await h?.close();
  });

  beforeEach(async () => {
    await truncateAll(h.dataSource);
    await h.resetRateLimits();
    on();
  });

  afterEach(() => {
    if (savedSwitch === undefined) delete process.env.HOUSEHOLD_ENABLED;
    else process.env.HOUSEHOLD_ENABLED = savedSwitch;
  });

  const tables = async () => {
    const [row] = await h.dataSource.query(
      `SELECT (SELECT count(*) FROM households)::int AS households,
              (SELECT count(*) FROM household_members)::int AS members,
              (SELECT count(*) FROM household_invitations)::int AS invitations`,
    );
    return row as { households: number; members: number; invitations: number };
  };

  const createLink = async (token: string) => {
    const res = await h.call("post", "/household/invitations", token, {});
    expect(res.status).toBe(201);
    return res.body as { token: string; expiresAt: string };
  };
  const accept = (token: string, link: string) =>
    h.call("post", "/household/invitations/accept", token, { token: link });
  const preview = (token: string, link: string) =>
    h.call("post", "/household/invitations/preview", token, { token: link });
  const getHousehold = async (token: string) => {
    const res = await h.call("get", "/household", token);
    expect(res.status).toBe(200);
    return res.body;
  };
  const summary = (token: string) => h.call("get", "/household/joint-summary", token);
  const share = (token: string, sharesJointSummary: boolean) =>
    h.call("post", "/household/sharing", token, { sharesJointSummary });
  /** A and B in one household (A invited, B accepted). */
  const joinAandB = async () => {
    const link = await createLink(h.tokens.a);
    const res = await accept(h.tokens.b, link.token);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "joined" });
  };
  const addAccount = (userId: string, fields: Partial<Account>) =>
    h.dataSource.getRepository(Account).save(
      h.dataSource.getRepository(Account).create({
        userId,
        name: "Account",
        type: "Current",
        balance: 100,
        ...fields,
      }),
    );
  const accountsOf = (userId: string) =>
    h.dataSource.query(`SELECT * FROM accounts WHERE user_id = $1 ORDER BY id`, [userId]);
  /** A third person, signed in now, with a run-time id. */
  const thirdPerson = async () => {
    const id = `user_hh_${randomBytes(6).toString("hex")}`;
    return { id, token: await h.signIn(id) };
  };

  describe("with the switch off, every route is an unknown route", () => {
    /** The same request on a path no route has, with "household" renamed. */
    const unknownTwin = (path: string) => path.replace("/household", "/zzhousehold");

    const comparable = (res: request.Response, path: string) => ({
      status: res.status,
      body: sansRequestId(res.body),
      headers: Object.fromEntries(
        Object.entries(res.headers)
          .filter(([name]) => !PER_REQUEST_HEADERS.has(name))
          // The deprecation link names the requested path; compare it with the path taken out.
          .map(([name, value]) => [name, String(value).split(path).join("<path>")]),
      ),
    });

    it.each(ROUTES.flatMap((r) => ["", "/v1"].map((prefix) => [r.key, prefix, r] as const)))(
      "%s (prefix '%s'): signed in and signed out, identical to an unknown route",
      async (_key, prefix, route) => {
        off();
        for (const token of [undefined, h.tokens.a, h.tokens.expired]) {
          const path = `${prefix}${route.path}`;
          const twin = `${prefix}${unknownTwin(route.path)}`;
          const real = await h.call(route.method, path, token, route.body);
          const unknown = await h.call(route.method, twin, token, route.body);
          expect(real.status).toBe(404);
          expect(real.body).toMatchObject({ code: "not_found", message: "Not found" });
          expect(comparable(real, route.path)).toEqual(
            comparable(unknown, unknownTwin(route.path)),
          );
        }
        expect(await tables()).toEqual({ households: 0, members: 0, invitations: 0 });
      },
    );

    it("a household made while on is invisible once the switch is off, and comes back on", async () => {
      await joinAandB();
      off();
      expect((await h.call("get", "/household", h.tokens.a)).status).toBe(404);
      expect((await summary(h.tokens.b)).status).toBe(404);
      expect((await h.call("post", "/household/leave", h.tokens.b, {})).status).toBe(404);
      expect(await tables()).toEqual({ households: 1, members: 2, invitations: 0 });
      on();
      expect((await getHousehold(h.tokens.a)).household).not.toBeNull();
    });

    it("refuses in the service too: no invitation can be created or accepted", async () => {
      const service = h.app.get(HouseholdService);
      const link = await createLink(h.tokens.a);
      off();
      await expect(service.createInvitation(USER_B)).rejects.toMatchObject({ status: 404 });
      await expect(service.acceptInvitation(USER_B, link.token)).rejects.toMatchObject({
        status: 404,
      });
      await expect(service.previewInvitation(USER_B, link.token)).rejects.toMatchObject({
        status: 404,
      });
      await expect(service.get(USER_A)).rejects.toMatchObject({ status: 404 });
      await expect(service.updateSharing(USER_A, true)).rejects.toMatchObject({ status: 404 });
      await expect(service.leave(USER_A)).rejects.toMatchObject({ status: 404 });
      await expect(service.cancelInvitation(USER_A)).rejects.toMatchObject({ status: 404 });
      await expect(service.jointSummary(USER_A)).rejects.toMatchObject({ status: 404 });
      expect(await tables()).toEqual({ households: 0, members: 0, invitations: 1 });
    });

    it("any value but true is off", async () => {
      for (const value of ["", "1", "yes", "TRUE ", "false", "on"]) {
        process.env.HOUSEHOLD_ENABLED = value;
        const res = await h.call("get", "/household", h.tokens.a);
        // "TRUE " trims to true: the switch reads trimmed, any case.
        expect(res.status, JSON.stringify(value)).toBe(value === "TRUE " ? 200 : 404);
      }
    });
  });

  describe("with the switch on", () => {
    it.each(ROUTES.map((r) => [r.key, r] as const))(
      "%s: no, expired and dev-bypass tokens get 401, nothing written",
      async (_key, route) => {
        for (const token of [undefined, h.tokens.expired, h.tokens.dev]) {
          const res = await h.call(route.method, route.path, token, route.body);
          expect(res.status, route.key).toBe(401);
        }
        expect(await tables()).toEqual({ households: 0, members: 0, invitations: 0 });
        ran(route.key, "authn");
      },
    );

    it("GET /household: nothing for someone never in one, exactly two keys (G4)", async () => {
      const body = await getHousehold(h.tokens.a);
      expect(body).toEqual({ household: null, invitation: null });
      ran("GET /household");
    });

    it("a link is stored only as its hash, shown once, and works for 48 hours", async () => {
      const logs = vi.spyOn(Logger.prototype, "log");
      const link = await createLink(h.tokens.a);
      expect(link.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
      const rows: Array<{ token_hash: string; inviter_user_id: string; ttl_hours: number }> =
        await h.dataSource.query(
          `SELECT token_hash, inviter_user_id,
                  EXTRACT(EPOCH FROM (expires_at - created_at)) / 3600 AS ttl_hours
           FROM household_invitations`,
        );
      expect(rows).toHaveLength(1);
      expect(rows[0]?.token_hash).toBe(createHash("sha256").update(link.token).digest("hex"));
      expect(rows[0]?.inviter_user_id).toBe(USER_A);
      expect(Number(rows[0]?.ttl_hours)).toBe(HOUSEHOLD_INVITATION_TTL_HOURS);
      // The raw token is nowhere in the database.
      const dump: Array<{ t: string }> = await h.dataSource.query(
        `SELECT row_to_json(i)::text AS t FROM household_invitations i`,
      );
      expect(dump.map((d) => d.t).join("")).not.toContain(link.token);
      // GET shows the open link's expiry, never the token.
      const state = await getHousehold(h.tokens.a);
      expect(state).toEqual({ household: null, invitation: { expiresAt: link.expiresAt } });
      expect(JSON.stringify(state)).not.toContain(link.token);
      // A preview and an accept with it: still nowhere in any log line.
      expect((await preview(h.tokens.b, link.token)).status).toBe(200);
      expect((await accept(h.tokens.b, link.token)).status).toBe(200);
      const warns = vi.mocked(Logger.prototype.warn).mock.calls;
      const lines = [...logs.mock.calls, ...warns].map((c) => JSON.stringify(c)).join("\n");
      expect(lines).not.toContain(link.token);
      expect(lines).not.toContain(rows[0]?.token_hash);
      logs.mockRestore();
      ran("POST /household/invitations");
    });

    it("a new link replaces the previous one; cancelling leaves none, the same answer twice", async () => {
      const first = await createLink(h.tokens.a);
      const second = await createLink(h.tokens.a);
      expect(second.token).not.toBe(first.token);
      expect((await tables()).invitations).toBe(1);
      expect((await accept(h.tokens.b, first.token)).status).toBe(410);
      for (let i = 0; i < 2; i++) {
        const res = await h.call("delete", "/household/invitations", h.tokens.a);
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ success: true });
      }
      expect((await tables()).invitations).toBe(0);
      expect((await accept(h.tokens.b, second.token)).status).toBe(410);
    });

    it("B cannot cancel A's link (G6): B's cancel touches only B's own", async () => {
      const link = await createLink(h.tokens.a);
      const res = await h.call("delete", "/household/invitations", h.tokens.b);
      expect(res.status).toBe(200);
      expect((await tables()).invitations).toBe(1);
      expect((await preview(h.tokens.b, link.token)).body).toEqual({ shares: [] });
      ran("DELETE /household/invitations");
    });

    it("preview shares nothing and names no one (G8), and does not use the link up", async () => {
      await h.dataSource
        .getRepository(UserProfile)
        .save(h.dataSource.getRepository(UserProfile).create({ userId: USER_A, firstName: "Ada" }));
      const link = await createLink(h.tokens.a);
      for (let i = 0; i < 2; i++) {
        const res = await preview(h.tokens.b, link.token);
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ shares: [] });
      }
      expect((await tables()).invitations).toBe(1);
      ran("POST /household/invitations/preview");
    });

    it("accepting binds the household to the accepting account, both sharing off (G2)", async () => {
      await addAccount(USER_A, { name: "A joint", ownership: "joint" });
      await addAccount(USER_B, { name: "B joint", ownership: "joint" });
      await joinAandB();
      const members: Array<{ user_id: string; slot: number; shares_joint_summary: boolean }> =
        await h.dataSource.query(
          `SELECT user_id, slot, shares_joint_summary FROM household_members ORDER BY slot`,
        );
      expect(members).toEqual([
        { user_id: USER_A, slot: 1, shares_joint_summary: false },
        { user_id: USER_B, slot: 2, shares_joint_summary: false },
      ]);
      expect(await tables()).toEqual({ households: 1, members: 2, invitations: 0 });
      for (const token of [h.tokens.a, h.tokens.b]) {
        const state = await getHousehold(token);
        expect(Object.keys(state).sort()).toEqual(["household", "invitation"]);
        expect(Object.keys(state.household).sort()).toEqual([
          "joinedAt",
          "sharesJointSummary",
          "withName",
        ]);
        expect(state.household.sharesJointSummary).toBe(false);
        expect(state.invitation).toBeNull();
        const s = await summary(token);
        expect(s.status).toBe(200);
        expect(s.body).toEqual({ items: [] });
      }
      ran("POST /household/invitations/accept");
    });

    it("withName is the other person's first name, else display name, else null, and nothing else", async () => {
      const profiles = h.dataSource.getRepository(UserProfile);
      await profiles.save(
        profiles.create({
          userId: USER_A,
          firstName: "Ada",
          displayName: "Ada L",
          annualSalary: 48123,
        }),
      );
      await profiles.save(profiles.create({ userId: USER_B, firstName: "  ", displayName: "Bo" }));
      await joinAandB();
      const a = await getHousehold(h.tokens.a);
      const b = await getHousehold(h.tokens.b);
      expect(a.household.withName).toBe("Bo");
      expect(b.household.withName).toBe("Ada");
      // Nothing else of the other person: not their id, salary or display name.
      expect(JSON.stringify(b)).not.toMatch(/user_A|48123|Ada L/);
      expect(JSON.stringify(a)).not.toContain(USER_B);
      await profiles.update({ userId: USER_B }, { displayName: null });
      expect((await getHousehold(h.tokens.a)).household.withName).toBeNull();
      await profiles.delete({ userId: USER_A });
      expect((await getHousehold(h.tokens.b)).household.withName).toBeNull();
    });

    it("a link is single use: once accepted, anyone else gets the one 410", async () => {
      const c = await thirdPerson();
      const link = await createLink(h.tokens.a);
      expect((await accept(h.tokens.b, link.token)).status).toBe(200);
      const again = await accept(c.token, link.token);
      expect(again.status).toBe(410);
      expect(sansRequestId(again.body)).toEqual({
        code: "invite_unusable",
        message: "This invitation link cannot be used.",
      });
      expect((await getHousehold(c.token)).household).toBeNull();
      expect(await tables()).toEqual({ households: 1, members: 2, invitations: 0 });
    });

    it("two people accepting one link at once: exactly one joins", async () => {
      for (let round = 0; round < 4; round++) {
        await truncateAll(h.dataSource);
        await h.resetRateLimits();
        const c = await thirdPerson();
        const link = await createLink(h.tokens.a);
        const [first, second] = await Promise.all([
          accept(h.tokens.b, link.token),
          accept(c.token, link.token),
        ]);
        const statuses = [first.status, second.status].sort();
        expect(statuses, `round ${round}`).toEqual([200, 410]);
        expect(await tables()).toEqual({ households: 1, members: 2, invitations: 0 });
        const members: Array<{ user_id: string }> = await h.dataSource.query(
          `SELECT user_id FROM household_members ORDER BY slot`,
        );
        const winner = first.status === 200 ? USER_B : c.id;
        expect(members.map((m) => m.user_id)).toEqual([USER_A, winner]);
      }
    });

    it("an expired link is the same 410 and is not used up; one still in date works", async () => {
      const link = await createLink(h.tokens.a);
      await h.dataSource.query(
        `UPDATE household_invitations SET expires_at = now() - interval '1 millisecond'`,
      );
      const expired = await accept(h.tokens.b, link.token);
      expect(expired.status).toBe(410);
      expect(expired.body.code).toBe("invite_unusable");
      expect((await preview(h.tokens.b, link.token)).status).toBe(410);
      expect((await tables()).invitations).toBe(1);
      // An expired link is not shown as open.
      expect((await getHousehold(h.tokens.a)).invitation).toBeNull();
      await h.dataSource.query(
        `UPDATE household_invitations SET expires_at = now() + interval '2 seconds'`,
      );
      expect((await accept(h.tokens.b, link.token)).status).toBe(200);
    });

    it("every unusable link is one 410 saying nothing of why", async () => {
      const c = await thirdPerson();
      const bodies: unknown[] = [];
      const expectUnusable = async (res: request.Response, why: string) => {
        expect(res.status, why).toBe(410);
        bodies.push(sansRequestId(res.body));
      };
      // Unknown.
      await expectUnusable(await accept(h.tokens.b, unknownToken()), "unknown");
      // Your own.
      const own = await createLink(h.tokens.b);
      await expectUnusable(await accept(h.tokens.b, own.token), "own");
      await expectUnusable(await preview(h.tokens.b, own.token), "own preview");
      // Cancelled.
      const cancelled = await createLink(h.tokens.a);
      await h.call("delete", "/household/invitations", h.tokens.a);
      await expectUnusable(await accept(h.tokens.b, cancelled.token), "cancelled");
      // The inviter is now in a household: A made a link, then joined C. Joining removes A's own
      // open link, so the row is put back to model one left over (the database allows it).
      const stale = await createLink(h.tokens.a);
      const fromC = await createLink(c.token);
      // Five link attempts an hour per address: start this part with a fresh budget.
      await h.resetRateLimits();
      expect((await accept(h.tokens.a, fromC.token)).status).toBe(200);
      expect((await tables()).invitations).toBe(1);
      await h.dataSource.query(
        `INSERT INTO household_invitations (token_hash, inviter_user_id, expires_at)
         VALUES ($1, $2, now() + interval '1 hour')`,
        [createHash("sha256").update(stale.token).digest("hex"), USER_A],
      );
      await expectUnusable(await accept(h.tokens.b, stale.token), "inviter in a household");
      await expectUnusable(await preview(h.tokens.b, stale.token), "inviter in a household");
      expect(new Set(bodies.map((b) => JSON.stringify(b))).size).toBe(1);
      expect(bodies[0]).toEqual({
        code: "invite_unusable",
        message: "This invitation link cannot be used.",
      });
    });

    it("a link whose inviter was erased is the same 410", async () => {
      const inviter = await thirdPerson();
      const link = await createLink(inviter.token);
      // Keep a copy of the link row, erase the inviter, then put it back to model a straggler.
      const [row] = await h.dataSource.query(`SELECT token_hash FROM household_invitations`);
      const del = await h.call("delete", "/user-profile", inviter.token, {
        confirmation: "DELETE",
      });
      expect(del.status).toBe(200);
      expect((await tables()).invitations).toBe(0);
      await h.dataSource.query(
        `INSERT INTO household_invitations (token_hash, inviter_user_id, expires_at)
         VALUES ($1, $2, now() + interval '1 hour')`,
        [row.token_hash, inviter.id],
      );
      expect((await preview(h.tokens.b, link.token)).status).toBe(410);
      expect((await accept(h.tokens.b, link.token)).status).toBe(410);
      expect((await tables()).households).toBe(0);
    });

    it("someone already in a household gets 409 first, before any token lookup", async () => {
      await joinAandB();
      const c = await thirdPerson();
      const link = await createLink(c.token);
      for (const token of [link.token, unknownToken()]) {
        const res = await accept(h.tokens.b, token);
        expect(res.status).toBe(409);
        expect(sansRequestId(res.body)).toEqual({
          code: "already_in_household",
          message: "You are already in a household.",
        });
        expect((await preview(h.tokens.b, token)).status).toBe(409);
      }
      // C's link is left unused.
      expect((await tables()).invitations).toBe(1);
      const create = await h.call("post", "/household/invitations", h.tokens.a, {});
      expect(create.status).toBe(409);
      expect(create.body.code).toBe("already_in_household");
    });

    it("the request bodies are strict: no one else's id can be passed (G1, G6)", async () => {
      expectProbeRejected(
        await h.call("post", "/household/invitations", h.tokens.a, {
          id: "x",
          userId: USER_B,
        }),
      );
      expectProbeRejected(
        await h.call("post", "/household/sharing", h.tokens.b, {
          sharesJointSummary: true,
          id: "x",
          userId: USER_A,
        }),
      );
      expectProbeRejected(
        await h.call("post", "/household/leave", h.tokens.b, { id: "x", userId: USER_A }),
      );
      expect(await tables()).toEqual({ households: 0, members: 0, invitations: 0 });
    });

    it("sharing is the caller's own choice only: B cannot change A's (G6)", async () => {
      await joinAandB();
      const res = await share(h.tokens.b, true);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ sharesJointSummary: true });
      const rows: Array<{ user_id: string; shares_joint_summary: boolean }> =
        await h.dataSource.query(
          `SELECT user_id, shares_joint_summary FROM household_members ORDER BY slot`,
        );
      expect(rows).toEqual([
        { user_id: USER_A, shares_joint_summary: false },
        { user_id: USER_B, shares_joint_summary: true },
      ]);
      expect((await share(h.tokens.b, false)).body).toEqual({ sharesJointSummary: false });
      const outside = await share((await thirdPerson()).token, true);
      expect(outside.status).toBe(404);
      expect(outside.body.code).toBe("household_not_found");
      ran("POST /household/sharing");
    });

    it("the summary: shared joint accounts of both, whole balances, no ISA or sole account", async () => {
      await addAccount(USER_A, {
        name: "House bills",
        type: "Current",
        balance: 1234.56,
        ownership: "joint",
        sharePercent: 30,
      });
      await addAccount(USER_A, { name: "A sole", type: "Saving", balance: 999 });
      await addAccount(USER_A, {
        name: "A rainy day",
        type: "Saving",
        balance: 50,
        ownership: "joint",
        accountSubtype: "cash_isa",
      });
      await addAccount(USER_B, {
        name: "Car loan",
        type: "Loan",
        balance: -4000,
        ownership: "joint",
      });
      await joinAandB();
      await share(h.tokens.a, true);
      await share(h.tokens.b, true);
      const fromB = await summary(h.tokens.b);
      // Whole balance 1,234.56, not 30% of it; ordered by name ("Car loan" < "House bills").
      expect(fromB.body).toEqual({
        items: [
          { name: "Car loan", type: "Loan", wholeBalance: -4000, addedBy: "you" },
          { name: "House bills", type: "Current", wholeBalance: 1234.56, addedBy: "other" },
        ],
      });
      const fromA = await summary(h.tokens.a);
      expect(fromA.body.items.map((i: { addedBy: string }) => i.addedBy)).toEqual(["other", "you"]);
      const outside = await summary((await thirdPerson()).token);
      expect(outside.status).toBe(404);
      expect(sansRequestId(outside.body)).toEqual({
        code: "household_not_found",
        message: "You are not in a household.",
      });
      ran("GET /household/joint-summary");
    });

    it("not sharing with joint accounts reads the same as sharing with none (G3)", async () => {
      await addAccount(USER_B, { name: "B bills", ownership: "joint", balance: 70 });
      const aJoint = await addAccount(USER_A, { name: "A bills", ownership: "joint", balance: 30 });
      await joinAandB();
      await share(h.tokens.b, true);
      // A has a joint account and does not share.
      const notSharing = await summary(h.tokens.b);
      // A shares and has no joint account.
      await h.dataSource.getRepository(Account).delete({ id: aJoint.id });
      await share(h.tokens.a, true);
      const sharingNone = await summary(h.tokens.b);
      expect(notSharing.status).toBe(200);
      expect(notSharing.body).toEqual(sharingNone.body);
      expect(notSharing.body).toEqual({
        items: [{ name: "B bills", type: "Current", wholeBalance: 70, addedBy: "you" }],
      });
    });

    it("leaving: at once and alone, nothing of the other changes, no call out (G4, G5, G7)", async () => {
      await addAccount(USER_A, { name: "A bills", ownership: "joint" });
      await addAccount(USER_B, { name: "B bills", ownership: "joint" });
      const c = await thirdPerson();
      const neverJoined = await getHousehold(c.token);
      await joinAandB();
      await share(h.tokens.a, true);
      const aBefore = await accountsOf(USER_A);
      const bBefore = await accountsOf(USER_B);
      const auditBefore = await h.dataSource.query(
        `SELECT count(*)::int AS n FROM audit_events WHERE user_id = $1`,
        [USER_A],
      );
      const fetchSpy = vi.spyOn(globalThis, "fetch");
      const left = await h.call("post", "/household/leave", h.tokens.b, {});
      expect(left.status).toBe(200);
      expect(left.body).toEqual({ success: true });
      expect(fetchSpy).not.toHaveBeenCalled();
      fetchSpy.mockRestore();
      expect(await tables()).toEqual({ households: 0, members: 0, invitations: 0 });
      // The other person's view equals someone who never joined.
      expect(await getHousehold(h.tokens.a)).toEqual(neverJoined);
      expect((await summary(h.tokens.a)).status).toBe(404);
      // Nothing of theirs changed, and nothing was written about it for them.
      expect(await accountsOf(USER_A)).toEqual(aBefore);
      expect(await accountsOf(USER_B)).toEqual(bBefore);
      expect(
        await h.dataSource.query(`SELECT count(*)::int AS n FROM audit_events WHERE user_id = $1`, [
          USER_A,
        ]),
      ).toEqual(auditBefore);
      // Leaving again is the same answer.
      expect((await h.call("post", "/household/leave", h.tokens.b, {})).body).toEqual({
        success: true,
      });
      ran("POST /household/leave");
    });

    it("B leaving cannot remove A's link, and A's leaving removes only A's own", async () => {
      const link = await createLink(h.tokens.a);
      const bLink = await createLink(h.tokens.b);
      await h.call("post", "/household/leave", h.tokens.b, {});
      expect((await preview((await thirdPerson()).token, link.token)).status).toBe(200);
      expect((await preview(h.tokens.a, bLink.token)).status).toBe(410);
    });

    it("erasing one person closes the household; the other's data is untouched (G7)", async () => {
      const inviter = await thirdPerson();
      await addAccount(USER_B, { name: "B bills", ownership: "joint" });
      await addAccount(inviter.id, { name: "C bills", ownership: "joint" });
      const link = await createLink(inviter.token);
      expect((await accept(h.tokens.b, link.token)).status).toBe(200);
      await share(h.tokens.b, true);
      const bBefore = await accountsOf(USER_B);
      // Erasure runs whatever the switch says.
      off();
      const del = await h.call("delete", "/user-profile", inviter.token, {
        confirmation: "DELETE",
      });
      expect(del.status).toBe(200);
      on();
      expect(await tables()).toEqual({ households: 0, members: 0, invitations: 0 });
      expect(await accountsOf(USER_B)).toEqual(bBefore);
      expect(await getHousehold(h.tokens.b)).toEqual({ household: null, invitation: null });
    });

    it("the export notes the person's own membership and link, never the other's", async () => {
      await addAccount(USER_A, { name: "Only A has this", ownership: "joint" });
      await joinAandB();
      await share(h.tokens.a, true);
      off();
      const res = await h.call("get", "/user-profile/export", h.tokens.b).buffer(true);
      expect(res.status).toBe(200);
      const text = res.text;
      const doc = JSON.parse(text) as { notes: string[] };
      const today = new Date().toISOString().slice(0, 10);
      expect(doc.notes).toContain(
        `Household: you joined a household on ${today}. You do not show your accounts in its summary.`,
      );
      expect(text).not.toContain(USER_A);
      expect(text).not.toContain("Only A has this");
    });

    it("rate limits: five previews or accepts an hour per person and per address", async () => {
      for (let i = 0; i < 5; i++) {
        expect((await preview(h.tokens.b, unknownToken())).status).toBe(410);
      }
      const sixth = await accept(h.tokens.b, unknownToken());
      expect(sixth.status).toBe(429);
      // The same address, another person: counted per address too.
      const c = await thirdPerson();
      expect((await preview(c.token, unknownToken())).status).toBe(429);
      await h.resetRateLimits();
      // Per person: from another address B is still limited (the per-user bucket).
      for (let i = 0; i < 5; i++) {
        expect((await accept(h.tokens.b, unknownToken())).status).toBe(410);
      }
      expect((await preview(h.tokens.b, unknownToken())).status).toBe(429);
    });

    it("rate limits: ten new links an hour per person", async () => {
      for (let i = 0; i < 10; i++) await createLink(h.tokens.a);
      expect((await h.call("post", "/household/invitations", h.tokens.a, {})).status).toBe(429);
      expect((await h.call("post", "/household/invitations", h.tokens.b, {})).status).toBe(201);
    });
  });

  describe("AI connections see nothing new (G9)", () => {
    const mcpCall = (pat: string, body: object) =>
      request(h.app.getHttpServer())
        .post("/mcp")
        .set("Accept", "application/json, text/event-stream")
        .set("Authorization", `Bearer ${pat}`)
        .set("Content-Type", "application/json")
        .send(body);
    const rpcText = (res: request.Response): string => {
      const raw = res.text.trim().startsWith("{")
        ? res.text
        : (res.text
            .split("\n")
            .find((l) => l.startsWith("data:"))
            ?.slice(5) ?? "{}");
      return raw;
    };
    const mint = async (token: string) => {
      const res = await h.call("post", "/mcp-tokens", token, { name: "agent", expiryDays: 30 });
      expect(res.status).toBe(201);
      return res.body.rawToken as string;
    };
    const toolNames = async (pat: string): Promise<string[]> => {
      const res = await mcpCall(pat, { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });
      expect(res.status).toBe(200);
      const rpc = JSON.parse(rpcText(res)) as { result: { tools: Array<{ name: string }> } };
      return rpc.result.tools.map((t) => t.name).sort();
    };

    it("the tool list is the same with the switch on or off, and names no household", async () => {
      const pat = await mint(h.tokens.b);
      off();
      const whenOff = await toolNames(pat);
      on();
      await joinAandB();
      const whenOn = await toolNames(pat);
      expect(whenOn).toEqual(whenOff);
      expect(whenOn.length).toBeGreaterThan(3);
      expect(whenOn.filter((n) => /household|partner|shared/i.test(n))).toEqual([]);
    });

    it("B's AI connection reads none of A's shared joint accounts", async () => {
      const marker = `A shared ${randomBytes(4).toString("hex")}`;
      await addAccount(USER_A, { name: marker, ownership: "joint", balance: 4321.09 });
      await addAccount(USER_B, { name: "B own joint", ownership: "joint", balance: 10 });
      await joinAandB();
      await share(h.tokens.a, true);
      await share(h.tokens.b, true);
      const pat = await mint(h.tokens.b);
      for (const name of ["list_accounts", "get_financial_snapshot"]) {
        const res = await mcpCall(pat, {
          jsonrpc: "2.0",
          id: 3,
          method: "tools/call",
          params: { name, arguments: {} },
        });
        expect(res.status, name).toBe(200);
        const text = rpcText(res);
        expect(text, name).not.toContain(marker);
        expect(text, name).not.toContain("4321.09");
        expect(text, name).not.toContain(USER_A);
      }
      const accounts = await mcpCall(pat, {
        jsonrpc: "2.0",
        id: 4,
        method: "tools/call",
        params: { name: "list_accounts", arguments: {} },
      });
      // Exactly one account, B's own: its £10 counted at the default joint share of 50% is £5
      // (10 x 0.5). A's £4,321.09 at 50% would be £2,160.55 (2,160.545 to the penny): not there.
      const listed = JSON.parse(
        (JSON.parse(rpcText(accounts)) as { result: { content: Array<{ text: string }> } }).result
          .content[0]?.text ?? "{}",
      ) as { result: { accounts: Array<{ balanceGbp: number }>; returnedCount: number } };
      expect(listed.result.returnedCount).toBe(1);
      expect(listed.result.accounts.map((a) => a.balanceGbp)).toEqual([5]);
      expect(rpcText(accounts)).not.toContain("2160.55");
    });
  });
});
