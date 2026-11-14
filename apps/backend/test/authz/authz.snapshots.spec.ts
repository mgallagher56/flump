import "reflect-metadata";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Account } from "../../src/entities/account.entity";
import { AccountDetail } from "../../src/entities/account-detail.entity";
import { SnapshotCheckin } from "../../src/entities/snapshot-checkin.entity";
import { writeConnectedSnapshot } from "../../src/snapshots/connected-write";
import { londonDate, londonYearMonth, monthKey } from "../../src/snapshots/london-date";
import { resolveDbTestMode } from "../../src/testing/dbTestMode";
import { ROUTE_MATRIX } from "./matrix";
import {
  type AuthzHarness,
  bootAuthzHarness,
  MISSING_ID,
  probeBody,
  truncateAll,
  USER_A,
  USER_B,
} from "./support";

vi.mock("../../src/config/typeorm.options", async (importOriginal) =>
  (await import("./support.js")).withMigrations(await importOriginal()),
);

/**
 * Monthly snapshot authz matrix (E20-N22 harness, E30), real AppModule on real Postgres.
 * A user can only write values for their own accounts; a foreign or unknown account id fails the
 * whole batch with the same 404 as an unknown id, and nothing is written.
 */
const dbMode = resolveDbTestMode(process.env);
const PAST = "2001-02";
const THIS_MONTH = monthKey(londonYearMonth());

describe.skipIf(dbMode === "skip")("authz: snapshots controller (real Postgres)", () => {
  let h: AuthzHarness;
  const exercised = new Set<string>();
  let accountA: string;
  let accountA2: string;
  let accountB: string;

  const details = () => h.dataSource.getRepository(AccountDetail);
  const accounts = () => h.dataSource.getRepository(Account);
  const put = (month: string, token: string | undefined, body?: object) =>
    h.call("put", `/snapshots/${month}`, token, body);
  const rowsFor = (accountId: string) =>
    details().find({ where: { accountId }, order: { year: "ASC", month: "ASC" } });

  beforeAll(async () => {
    h = await bootAuthzHarness();
  }, 60_000);

  afterAll(async () => {
    const expected = Object.entries(ROUTE_MATRIX)
      .filter(([, row]) => row.status === "covered" && row.spec === "snapshots")
      .map(([key]) => key)
      .sort();
    expect([...exercised].sort()).toEqual(expected);
    await h?.close();
  });

  beforeEach(async () => {
    await truncateAll(h.dataSource);
    h.resetRateLimits();
    const create = async (token: string, name: string, balance: number) => {
      const res = await h.call("post", "/accounts", token, { name, type: "Saving", balance });
      expect(res.status).toBe(201);
      return res.body.id as string;
    };
    accountA = await create(h.tokens.a, "A Saver", 100);
    accountA2 = await create(h.tokens.a, "A Second", 50);
    accountB = await create(h.tokens.b, "B Saver", 900);
  });

  it("PUT /snapshots/:month: no, expired and dev-bypass tokens get 401 and nothing is written", async () => {
    exercised.add("PUT /snapshots/:month");
    for (const token of [undefined, h.tokens.expired, h.tokens.dev]) {
      const res = await put(PAST, token, { values: [{ accountId: accountA, value: 5 }] });
      expect(res.status).toBe(401);
    }
    expect(await details().count()).toBe(0);
  });

  it("A writes own accounts: 200, stored with user_id, source manual and the month's last day", async () => {
    const res = await put(PAST, h.tokens.a, { values: [{ accountId: accountA, value: 1234.56 }] });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ month: PAST, completed: false });
    const [row] = await rowsFor(accountA);
    expect(row).toMatchObject({
      userId: USER_A,
      year: 2001,
      month: 2,
      source: "manual",
      asOfDate: "2001-02-28",
    });
    expect(Number(row?.value)).toBe(1234.56);
  });

  it("B cannot write A's account: same 404 as an unknown account, nothing written", async () => {
    const asB = await put(PAST, h.tokens.b, { values: [{ accountId: accountA, value: 1 }] });
    const missing = await put(PAST, h.tokens.b, { values: [{ accountId: MISSING_ID, value: 1 }] });
    expect(asB.status).toBe(404);
    expect(missing.status).toBe(404);
    expect(asB.body).toEqual(missing.body);
    expect(await details().count()).toBe(0);
  });

  it("a batch with one foreign account fails whole: own accounts are not written either", async () => {
    const res = await put(PAST, h.tokens.a, {
      values: [
        { accountId: accountA, value: 1 },
        { accountId: accountB, value: 2 },
      ],
    });
    expect(res.status).toBe(404);
    expect(await details().count()).toBe(0);
  });

  it("ignores userId and id smuggled into the body", async () => {
    const res = await put(PAST, h.tokens.b, {
      ...probeBody(String(accountA)),
      values: [{ accountId: accountB, value: 7, userId: USER_A, id: 1, source: "connected" }],
    });
    expect(res.status).toBe(200);
    const [row] = await rowsFor(accountB);
    expect(row).toMatchObject({ userId: USER_B, source: "manual" });
    expect(await rowsFor(accountA)).toHaveLength(0);
  });

  it("rejects non-UUID account ids without a 500", async () => {
    const res = await put(PAST, h.tokens.a, { values: [{ accountId: "not-a-uuid", value: 1 }] });
    // The contract rejects it at the boundary (enforce is the default, E21).
    expect(res.status).toBe(400);
  });

  it("treats an upper-case account id as the same account (one row, lower-case key)", async () => {
    const res = await put(PAST, h.tokens.a, {
      values: [{ accountId: accountA.toUpperCase(), value: 11 }],
    });
    expect(res.status).toBe(200);
    const dup = await put(PAST, h.tokens.a, {
      values: [
        { accountId: accountA.toUpperCase(), value: 1 },
        { accountId: accountA, value: 2 },
      ],
    });
    expect(dup.status).toBe(400);
    const rows = await rowsFor(accountA);
    expect(rows).toHaveLength(1);
    expect(Number(rows[0]?.value)).toBe(11);
  });

  it("stores liabilities negative, like connected sync, whatever sign was sent", async () => {
    const card = await h.call("post", "/accounts", h.tokens.a, {
      name: "Card",
      type: "Credit Card",
      balance: -300,
    });
    const id = card.body.id as string;
    await put(THIS_MONTH, h.tokens.a, { values: [{ accountId: id, value: 450 }] });
    expect(Number((await rowsFor(id))[0]?.value)).toBe(-450);
    expect(Number((await accounts().findOneBy({ id }))?.balance)).toBe(-450);
  });

  it("every write path stores a liability negative and keys history by the lower-case id", async () => {
    const card = await h.call("post", "/accounts", h.tokens.a, {
      name: "Card",
      type: "Credit Card",
      balance: -10,
    });
    const id = card.body.id as string;
    const batch = await h.call("patch", "/accounts/balances", h.tokens.a, {
      balances: [{ id: id.toUpperCase(), balance: 700 }],
    });
    expect(batch.status).toBe(200);
    expect(Number((await accounts().findOneBy({ id }))?.balance)).toBe(-700);
    let rows = await rowsFor(id);
    expect(rows).toHaveLength(1);
    expect(Number(rows[0]?.value)).toBe(-700);

    const edit = await h.call("patch", `/accounts/${id.toUpperCase()}`, h.tokens.a, {
      balance: 800,
    });
    expect(edit.status).toBe(200);
    rows = await rowsFor(id);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.accountId).toBe(id);
    expect(Number(rows[0]?.value)).toBe(-800);
    expect(Number((await accounts().findOneBy({ id }))?.balance)).toBe(-800);
  });

  it("connected write is atomic against manual: SQL leaves a manual month and its balance alone", async () => {
    const { year, month } = londonYearMonth();
    const write = (value: number) =>
      writeConnectedSnapshot(details(), accounts(), {
        accountId: accountA,
        userId: USER_A,
        year,
        month,
        value,
        asOfDate: londonDate(),
      });
    expect(await write(111)).toBe(true);
    expect((await rowsFor(accountA))[0]).toMatchObject({ source: "connected" });
    expect(Number((await accounts().findOneBy({ id: accountA }))?.balance)).toBe(111);
    expect(await write(222)).toBe(true);
    expect(Number((await rowsFor(accountA))[0]?.value)).toBe(222);

    await put(THIS_MONTH, h.tokens.a, { values: [{ accountId: accountA, value: 333 }] });
    expect(await write(444)).toBe(false);
    const [row] = await rowsFor(accountA);
    expect(row).toMatchObject({ source: "manual" });
    expect(Number(row?.value)).toBe(333);
    expect(Number((await accounts().findOneBy({ id: accountA }))?.balance)).toBe(333);
    // Another user's account id never matches the balance update.
    expect(await rowsFor(accountB)).toHaveLength(0);
  });

  it("partial batch leaves unlisted accounts alone", async () => {
    await put(PAST, h.tokens.a, { values: [{ accountId: accountA, value: 10 }] });
    expect(await rowsFor(accountA2)).toHaveLength(0);
    expect(await rowsFor(accountA)).toHaveLength(1);
  });

  it("latest write wins and a past month can be edited", async () => {
    await put(PAST, h.tokens.a, { values: [{ accountId: accountA, value: 10 }] });
    const second = await put(PAST, h.tokens.a, {
      values: [{ accountId: accountA, value: 20.5, asOfDate: "2001-02-10" }],
    });
    expect(second.status).toBe(200);
    const rows = await rowsFor(accountA);
    expect(rows).toHaveLength(1);
    expect(Number(rows[0]?.value)).toBe(20.5);
    expect(rows[0]?.asOfDate).toBe("2001-02-10");
  });

  it("rejects future months, bad months, bad dates, duplicates and bad values with 400", async () => {
    const ok = [{ accountId: accountA, value: 1 }];
    const bad: Array<[string, object]> = [
      ["2999-01", { values: ok }],
      ["2026-13", { values: ok }],
      ["1999-12", { values: ok }],
      [PAST, { values: [{ accountId: accountA, value: 1, asOfDate: "2001-03-01" }] }],
      [PAST, { values: [{ accountId: accountA, value: 1, asOfDate: "2001-02-30" }] }],
      [
        PAST,
        {
          values: [
            { accountId: accountA, value: 1 },
            { accountId: accountA, value: 2 },
          ],
        },
      ],
      [PAST, { values: [{ accountId: accountA, value: 1.234 }] }],
      [PAST, { values: [{ accountId: accountA, value: "5" }] }],
      [PAST, { values: "nope" }],
    ];
    for (const [month, body] of bad) {
      const res = await put(month, h.tokens.a, body);
      expect(res.status, `${month} ${JSON.stringify(body)}`).toBe(400);
    }
    expect(await details().count()).toBe(0);
  });

  it("the current month stamps today's London date and moves the account's balance", async () => {
    const res = await put(THIS_MONTH, h.tokens.a, {
      values: [{ accountId: accountA, value: 321 }],
      complete: true,
    });
    expect(res.status).toBe(200);
    const [row] = await rowsFor(accountA);
    expect(row?.asOfDate).toBe(londonDate());
    expect(Number((await accounts().findOneBy({ id: accountA }))?.balance)).toBe(321);
  });

  it("a past month never touches the account's balance", async () => {
    await put(PAST, h.tokens.a, { values: [{ accountId: accountA, value: 999 }] });
    expect(Number((await accounts().findOneBy({ id: accountA }))?.balance)).toBe(100);
  });

  it("complete records the check-in once, per user", async () => {
    await put(PAST, h.tokens.a, { values: [], complete: true });
    await put(PAST, h.tokens.a, { values: [], complete: true });
    await put(PAST, h.tokens.b, { values: [], complete: true });
    const rows = await h.dataSource
      .getRepository(SnapshotCheckin)
      .find({ order: { userId: "ASC" } });
    expect(rows.map((r) => [r.userId, r.month])).toEqual([
      [USER_A, PAST],
      [USER_B, PAST],
    ]);
  });

  it("onboarding completion writes the first snapshot (source=onboarding) once", async () => {
    const first = await h.call("patch", "/user-profile", h.tokens.a, { onboardingCompleted: true });
    expect(first.status).toBe(200);
    const rows = await rowsFor(accountA);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ userId: USER_A, source: "onboarding", asOfDate: londonDate() });
    expect(Number(rows[0]?.value)).toBe(100);
    // A later manual value is not clobbered by a repeated onboarding PATCH.
    await put(THIS_MONTH, h.tokens.a, { values: [{ accountId: accountA, value: 5 }] });
    await h.call("patch", "/user-profile", h.tokens.a, { onboardingCompleted: true });
    expect(Number((await rowsFor(accountA))[0]?.value)).toBe(5);
    // Nothing was written for B.
    expect(await rowsFor(accountB)).toHaveLength(0);
  });

  it("reset-financial-data erases the user's history and check-ins, and only theirs", async () => {
    await put(PAST, h.tokens.a, { values: [{ accountId: accountA, value: 1 }], complete: true });
    await put(PAST, h.tokens.b, { values: [{ accountId: accountB, value: 2 }], complete: true });
    const res = await h.call("post", "/user-profile/reset-financial-data", h.tokens.a, {
      confirmation: "RESET",
    });
    expect(res.status).toBeLessThan(300);
    expect(await details().findBy({ userId: USER_A })).toHaveLength(0);
    expect(
      await h.dataSource.getRepository(SnapshotCheckin).findBy({ userId: USER_A }),
    ).toHaveLength(0);
    expect(await details().findBy({ userId: USER_B })).toHaveLength(1);
    expect(
      await h.dataSource.getRepository(SnapshotCheckin).findBy({ userId: USER_B }),
    ).toHaveLength(1);
  });
});
