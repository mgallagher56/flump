import "reflect-metadata";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveDbTestMode } from "../../src/testing/dbTestMode";
import { ROUTE_MATRIX } from "./matrix";
import {
  type AuthzHarness,
  bootAuthzHarness,
  expectProbeRejected,
  MISSING_ID,
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
 * Invite links for the invite-only beta, real AppModule on real Postgres. USER_A is the only
 * admin (BETA_ADMIN_USER_IDS), which makes the beta invite-only; USER_B starts uninvited. Covers
 * authentication on every beta route, the admin-only 404, and redeeming end to end: joined,
 * already-member (link untouched), the one 410 for used, cancelled, expired and unknown links,
 * removal (refused at once) and re-invite.
 */
const dbMode = resolveDbTestMode(process.env);

describe.skipIf(dbMode === "skip")("authz: beta invite links (real Postgres)", () => {
  let h: AuthzHarness;
  const exercised = new Set<string>();
  const ran = (key: string, kind: "authn" | "idor" = "idor") => exercised.add(`${key}:${kind}`);

  beforeAll(async () => {
    h = await bootAuthzHarness({ env: { BETA_ADMIN_USER_IDS: USER_A } });
  }, 60_000);

  afterAll(async () => {
    const expected = Object.entries(ROUTE_MATRIX)
      .filter(([, row]) => row.status === "covered" && row.spec === "beta")
      .flatMap(([key]) => [`${key}:authn`, `${key}:idor`])
      .sort();
    expect([...exercised].sort()).toEqual(expected);
    await h?.close();
  });

  beforeEach(async () => {
    await truncateAll(h.dataSource);
    await h.resetRateLimits();
  });

  /** A new link made by the admin. */
  const createInvite = async (label?: string) => {
    const res = await h.call("post", "/beta/admin/invites", h.tokens.a, label ? { label } : {});
    expect(res.status).toBe(201);
    return res.body as { id: string; token: string; label: string | null };
  };
  const redeemAsB = (token: string) =>
    h.call("post", "/beta/invites/redeem", h.tokens.b, { token });
  /** A route every member may use, to tell "in the beta" from "refused". */
  const bCanUseTheApp = async () => (await h.call("get", "/mcp-tokens", h.tokens.b)).status;
  const unknownRoute = async (method: "get" | "post" | "delete", path: string) =>
    sansRequestId((await h.call(method, path, h.tokens.b)).body);

  describe("authentication (every beta route)", () => {
    const routes: Array<{
      key: string;
      method: "get" | "post" | "delete";
      path: string;
      body?: object;
    }> = [
      {
        key: "POST /beta/invites/redeem",
        method: "post",
        path: "/beta/invites/redeem",
        body: { token: "a".repeat(43) },
      },
      { key: "GET /beta/admin", method: "get", path: "/beta/admin" },
      { key: "GET /beta/admin/invites", method: "get", path: "/beta/admin/invites" },
      { key: "POST /beta/admin/invites", method: "post", path: "/beta/admin/invites", body: {} },
      {
        key: "DELETE /beta/admin/invites/:id",
        method: "delete",
        path: `/beta/admin/invites/${MISSING_ID}`,
      },
      { key: "GET /beta/admin/members", method: "get", path: "/beta/admin/members" },
      {
        key: "DELETE /beta/admin/members/:userId",
        method: "delete",
        path: `/beta/admin/members/${USER_B}`,
      },
    ];

    it.each(routes.map((r) => [r.key, r] as const))(
      "%s: no, expired and dev-bypass tokens get 401, nothing written",
      async (_key, route) => {
        for (const token of [undefined, h.tokens.expired, h.tokens.dev]) {
          const res = await h.call(route.method, route.path, token, route.body);
          expect(res.status, `${route.key}`).toBe(401);
        }
        const [{ n }] = await h.dataSource.query(
          `SELECT (SELECT count(*) FROM beta_invites) + (SELECT count(*) FROM beta_members) AS n`,
        );
        expect(Number(n)).toBe(0);
        ran(route.key, "authn");
      },
    );
  });

  it("an uninvited caller is refused everywhere but redeem; joining lets them in", async () => {
    const invite = await createInvite("For B");
    expect(invite.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const refused = await h.call("get", "/mcp-tokens", h.tokens.b);
    expect(refused.status).toBe(403);
    expect(refused.body.code ?? refused.body.error).toBe("not_invited");

    // The raw token is never stored: only its hash.
    const [row] = await h.dataSource.query(`SELECT token_hash FROM beta_invites WHERE id = $1`, [
      invite.id,
    ]);
    expect(row.token_hash).not.toContain(invite.token);
    expect(row.token_hash).toMatch(/^[0-9a-f]{64}$/);

    // A strict body: a caller cannot name another user.
    expectProbeRejected(
      await h.call("post", "/beta/invites/redeem", h.tokens.b, {
        token: invite.token,
        id: MISSING_ID,
        userId: USER_A,
      }),
    );

    const joined = await redeemAsB(invite.token);
    expect(joined.status).toBe(200);
    expect(joined.body).toEqual({ status: "joined" });
    expect(await bCanUseTheApp()).toBe(200);

    // A second link while already a member: nothing changes and the link stays unused.
    const spare = await createInvite();
    expect((await redeemAsB(spare.token)).body).toEqual({ status: "already-member" });
    const list = await h.call("get", "/beta/admin/invites", h.tokens.a);
    expect(list.status).toBe(200);
    const statuses = Object.fromEntries(
      (list.body.invites as Array<{ id: string; status: string }>).map((i) => [i.id, i.status]),
    );
    expect(statuses).toEqual({ [invite.id]: "used", [spare.id]: "unused" });

    // The admin is always in: already-member, and the link is not used up.
    const adminTry = await h.call("post", "/beta/invites/redeem", h.tokens.a, {
      token: spare.token,
    });
    expect(adminTry.body).toEqual({ status: "already-member" });
    ran("POST /beta/invites/redeem");
  });

  it("used, cancelled, expired and unknown links all get the same 410", async () => {
    const used = await createInvite();
    const cancelled = await createInvite();
    const expired = await createInvite();
    expect((await redeemAsB(used.token)).status).toBe(200);
    // B leaves, so the next tries are judged on the link alone.
    expect((await h.call("delete", `/beta/admin/members/${USER_B}`, h.tokens.a)).status).toBe(200);
    expect((await h.call("delete", `/beta/admin/invites/${cancelled.id}`, h.tokens.a)).status).toBe(
      200,
    );
    await h.dataSource.query(
      `UPDATE beta_invites SET expires_at = now() - interval '1 second' WHERE id = $1`,
      [expired.id],
    );
    const bodies = [];
    for (const token of [used.token, cancelled.token, expired.token, "z".repeat(43)]) {
      const res = await redeemAsB(token);
      expect(res.status).toBe(410);
      bodies.push(sansRequestId(res.body));
    }
    expect(new Set(bodies.map((b) => JSON.stringify(b))).size).toBe(1);
    expect(bodies[0]).toMatchObject({ message: "This invite link cannot be used." });
    // None of them let B back in.
    expect(await bCanUseTheApp()).toBe(403);
  });

  it("removing a member refuses them at once; a new link brings them back", async () => {
    const first = await createInvite("First");
    expect((await redeemAsB(first.token)).status).toBe(200);
    const members = await h.call("get", "/beta/admin/members", h.tokens.a);
    expect(members.status).toBe(200);
    expect(members.body.members).toEqual([
      { userId: USER_B, label: "First", addedAt: expect.any(String) },
    ]);
    ran("GET /beta/admin/members");

    expect((await h.call("delete", `/beta/admin/members/${USER_B}`, h.tokens.a)).body).toEqual({
      success: true,
    });
    expect(await bCanUseTheApp()).toBe(403);
    // Removing again, or someone who never joined: the same 404.
    expect((await h.call("delete", `/beta/admin/members/${USER_B}`, h.tokens.a)).status).toBe(404);
    expect((await h.call("delete", `/beta/admin/members/user_nobody`, h.tokens.a)).status).toBe(
      404,
    );
    expect((await h.call("get", "/beta/admin/members", h.tokens.a)).body).toEqual({ members: [] });

    const second = await createInvite("Second");
    expect((await redeemAsB(second.token)).body).toEqual({ status: "joined" });
    expect(await bCanUseTheApp()).toBe(200);
    const again = await h.call("get", "/beta/admin/members", h.tokens.a);
    expect(again.body.members).toEqual([
      { userId: USER_B, label: "Second", addedAt: expect.any(String) },
    ]);
    ran("DELETE /beta/admin/members/:userId");
  });

  it("the admin routes answer a member who is not an admin exactly as an unknown route", async () => {
    const invite = await createInvite();
    expect((await redeemAsB(invite.token)).status).toBe(200);
    const cases: Array<{ key: string; method: "get" | "post" | "delete"; path: string }> = [
      { key: "GET /beta/admin", method: "get", path: "/beta/admin" },
      { key: "GET /beta/admin/invites", method: "get", path: "/beta/admin/invites" },
      { key: "POST /beta/admin/invites", method: "post", path: "/beta/admin/invites" },
      {
        key: "DELETE /beta/admin/invites/:id",
        method: "delete",
        path: `/beta/admin/invites/${invite.id}`,
      },
      {
        key: "DELETE /beta/admin/members/:userId",
        method: "delete",
        path: `/beta/admin/members/${USER_B}`,
      },
    ];
    for (const c of cases) {
      const res = await h.call(c.method, c.path, h.tokens.b);
      expect(res.status, c.key).toBe(404);
      const unknown = await unknownRoute(c.method, c.path.replace("/beta/admin", "/beta/nothing"));
      expect(sansRequestId(res.body), c.key).toEqual(unknown);
    }
    // Nothing was created, cancelled or removed.
    expect(await bCanUseTheApp()).toBe(200);
    const [{ n }] = await h.dataSource.query(`SELECT count(*)::int AS n FROM beta_invites`);
    expect(n).toBe(1);

    const status = await h.call("get", "/beta/admin", h.tokens.a);
    expect(status.status).toBe(200);
    expect(status.body).toEqual({ admin: true });
    ran("GET /beta/admin");
  });

  it("the admin creates, lists and cancels links; only an unused link can be cancelled", async () => {
    const labelled = await createInvite("  For Sam  ");
    expect(labelled.label).toBe("For Sam");
    const plain = await createInvite();
    expect(plain.label).toBeNull();
    expect(
      (await h.call("post", "/beta/admin/invites", h.tokens.a, { label: "x".repeat(61) })).status,
    ).toBe(400);
    ran("POST /beta/admin/invites");

    const list = await h.call("get", "/beta/admin/invites", h.tokens.a);
    expect(list.status).toBe(200);
    // Newest first; never the token or its hash.
    expect(list.body.invites.map((i: { id: string }) => i.id)).toEqual([plain.id, labelled.id]);
    expect(JSON.stringify(list.body)).not.toContain(labelled.token);
    expect(Object.keys(list.body.invites[0]).sort()).toEqual(
      ["createdAt", "expiresAt", "id", "label", "status", "usedAt"].sort(),
    );
    ran("GET /beta/admin/invites");

    expect((await h.call("delete", `/beta/admin/invites/${plain.id}`, h.tokens.a)).body).toEqual({
      success: true,
    });
    // Cancelled already, used, or unknown: one 404.
    expect((await h.call("delete", `/beta/admin/invites/${plain.id}`, h.tokens.a)).status).toBe(
      404,
    );
    expect((await redeemAsB(labelled.token)).status).toBe(200);
    expect((await h.call("delete", `/beta/admin/invites/${labelled.id}`, h.tokens.a)).status).toBe(
      404,
    );
    expect((await h.call("delete", `/beta/admin/invites/${MISSING_ID}`, h.tokens.a)).status).toBe(
      404,
    );
    const after = await h.call("get", "/beta/admin/invites", h.tokens.a);
    expect(
      Object.fromEntries(
        after.body.invites.map((i: { id: string; status: string }) => [i.id, i.status]),
      ),
    ).toEqual({ [plain.id]: "cancelled", [labelled.id]: "used" });
    ran("DELETE /beta/admin/invites/:id");
  });
});
