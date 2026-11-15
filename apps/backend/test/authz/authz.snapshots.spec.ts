import "reflect-metadata";
import { calculateCheckInBalance } from "@flump/finance-engine";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Account } from "../../src/entities/account.entity";
import { AccountDetail } from "../../src/entities/account-detail.entity";
import { SnapshotCheckin } from "../../src/entities/snapshot-checkin.entity";
import { writeConnectedSnapshot } from "../../src/modules/snapshots/connected-write";
import { londonDate, londonYearMonth, monthKey } from "../../src/modules/snapshots/london-date";
import { resolveDbTestMode } from "../../src/testing/dbTestMode";
import { ROUTE_MATRIX } from "./matrix";
import {
  type AuthzHarness,
  bootAuthzHarness,
  expectProbeRejected,
  MISSING_ID,
  probeBody,
  sansRequestId,
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
    await h.resetRateLimits();
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
    expect(sansRequestId(asB.body)).toEqual(sansRequestId(missing.body));
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

  it("rejects userId and id smuggled into the body (strict, BE-09) and writes nothing", async () => {
    const res = await put(PAST, h.tokens.b, {
      ...probeBody(String(accountA)),
      values: [{ accountId: accountB, value: 7, userId: USER_A, id: 1, source: "connected" }],
    });
    expectProbeRejected(res);
    expect(res.body.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "body.values.0.userId", code: "unrecognized_keys" }),
        // `source` is a known key since R2-5, but "connected" is server-set only.
        expect.objectContaining({ path: "body.values.0.source" }),
      ]),
    );
    expect(await rowsFor(accountB)).toHaveLength(0);
    expect(await rowsFor(accountA)).toHaveLength(0);
  });

  it("R2-5: a client may send manual, confirmed or calculated; server-set sources are rejected", async () => {
    const ok = await put(PAST, h.tokens.a, {
      values: [{ accountId: accountA, value: 100, source: "confirmed" }],
    });
    expect(ok.status).toBe(200);
    expect(ok.body.values[0]).toMatchObject({ source: "confirmed" });
    expect((await rowsFor(accountA))[0]).toMatchObject({ source: "confirmed" });
    for (const source of ["onboarding", "connected", "backfill", "agent", "guess"]) {
      const res = await put(PAST, h.tokens.a, {
        values: [{ accountId: accountA2, value: 1, source }],
      });
      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ code: "validation_failed" });
    }
    expect(await rowsFor(accountA2)).toHaveLength(0);
  });

  it("R2-5: a calculated value must match the engine's figure to the penny", async () => {
    const created = await h.call("post", "/accounts", h.tokens.a, {
      name: "A Mortgage",
      type: "Mortgage",
      balance: 186000,
      interestRate: 4.5,
      monthlyContribution: 1250,
    });
    expect(created.status).toBe(201);
    const mortgage = created.body.id as string;
    expect(
      (await put("2001-01", h.tokens.a, { values: [{ accountId: mortgage, value: 186000 }] }))
        .status,
    ).toBe(200);
    const expected = calculateCheckInBalance({
      type: "Mortgage",
      interestRate: 4.5,
      monthlyPayment: 1250,
      base: { value: 186000, month: "2001-01" },
      month: PAST,
    });
    expect(expected?.value).toBe(185447.5);

    const wrong = await put(PAST, h.tokens.a, {
      values: [{ accountId: mortgage, value: 185000, source: "calculated" }],
    });
    expect(wrong.status).toBe(400);
    const notCalculable = await put(PAST, h.tokens.a, {
      values: [{ accountId: accountA, value: 100, source: "calculated" }],
    });
    expect(notCalculable.status).toBe(400);
    expect(await rowsFor(mortgage)).toHaveLength(1);

    const right = await put(PAST, h.tokens.a, {
      values: [{ accountId: mortgage, value: expected?.value, source: "calculated" }],
    });
    expect(right.status).toBe(200);
    const rows = await rowsFor(mortgage);
    expect(rows[1]).toMatchObject({ source: "calculated" });
    expect(Number(rows[1]?.value)).toBe(-185447.5);
  });

  it("R2-5 ruling (b): no calculated value when the saved balance differs from the latest record", async () => {
    const created = await h.call("post", "/accounts", h.tokens.a, {
      name: "A Car loan",
      type: "Loan",
      balance: 8400,
      interestRate: 7.9,
      monthlyContribution: 265,
    });
    expect(created.status).toBe(201);
    const loan = created.body.id as string;
    // A past month does not move the saved balance, so the record (8,610) and saved (8,400) differ.
    expect(
      (await put("2001-01", h.tokens.a, { values: [{ accountId: loan, value: 8610 }] })).status,
    ).toBe(200);
    const fromRecord = calculateCheckInBalance({
      type: "Loan",
      interestRate: 7.9,
      monthlyPayment: 265,
      base: { value: 8610, month: "2001-01" },
      month: PAST,
    });
    expect(fromRecord).not.toBeNull();
    const res = await put(PAST, h.tokens.a, {
      values: [{ accountId: loan, value: fromRecord?.value, source: "calculated" }],
    });
    expect(res.status).toBe(400);
    expect(await rowsFor(loan)).toHaveLength(1);
  });

  it("R2-5: a retried calculated save for this month (response lost) is accepted", async () => {
    const created = await h.call("post", "/accounts", h.tokens.a, {
      name: "A Loan",
      type: "Loan",
      balance: 8610,
      interestRate: 7.9,
      monthlyContribution: 265,
    });
    expect(created.status).toBe(201);
    const loan = created.body.id as string;
    const [y, m] = THIS_MONTH.split("-").map(Number) as [number, number];
    const previous = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
    expect(
      (await put(previous, h.tokens.a, { values: [{ accountId: loan, value: 8610 }] })).status,
    ).toBe(200);
    const expected = calculateCheckInBalance({
      type: "Loan",
      interestRate: 7.9,
      monthlyPayment: 265,
      base: { value: 8610, month: previous },
      month: THIS_MONTH,
      savedBalance: 8610,
    });
    const body = { values: [{ accountId: loan, value: expected?.value, source: "calculated" }] };
    expect((await put(THIS_MONTH, h.tokens.a, body)).status).toBe(200);
    // The first save moved the saved balance to the calculated figure; the retry still succeeds.
    expect((await put(THIS_MONTH, h.tokens.a, body)).status).toBe(200);
    expect(await rowsFor(loan)).toHaveLength(2);
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

  describe("If-Match (BE-16, audit M7)", () => {
    const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    const storedValue = async (accountId: string) => Number((await rowsFor(accountId))[0]?.value);

    it("answers with the ETag of the rows it wrote", async () => {
      const res = await put(PAST, h.tokens.a, {
        values: [
          { accountId: accountA, value: 100 },
          { accountId: accountA2, value: 50 },
        ],
      });
      expect(res.status).toBe(200);
      const [rowA] = await rowsFor(accountA);
      const [rowA2] = await rowsFor(accountA2);
      expect(res.headers.etag).toBe(`"${rowA?.updatedAt.toISOString()}"`);
      expect(res.headers.etag).toBe(`"${rowA2?.updatedAt.toISOString()}"`);
    });

    it("a row changed somewhere else is a 412 and nothing in the batch is written", async () => {
      const first = await put(PAST, h.tokens.a, {
        values: [
          { accountId: accountA, value: 100 },
          { accountId: accountA2, value: 50 },
        ],
      });
      const read = first.headers.etag as string;
      await pause(5);
      // Another tab or an AI connection changes account A.
      const elsewhere = await put(PAST, h.tokens.a, {
        values: [{ accountId: accountA, value: 120 }],
      });
      expect(elsewhere.status).toBe(200);
      expect(elsewhere.headers.etag).not.toBe(read);

      // This tab still holds the version it read: refused whole, the second account too.
      const stale = await put(PAST, h.tokens.a, {
        values: [
          { accountId: accountA, value: 130 },
          { accountId: accountA2, value: 60 },
        ],
      }).set("If-Match", read);
      expect(stale.status).toBe(412);
      expect(stale.body.code).toBe("precondition_failed");
      expect(await storedValue(accountA)).toBe(120);
      expect(await storedValue(accountA2)).toBe(50);

      // The account nobody else touched still matches the version read.
      await pause(5);
      const untouched = await put(PAST, h.tokens.a, {
        values: [{ accountId: accountA2, value: 60 }],
      }).set("If-Match", read);
      expect(untouched.status).toBe(200);
      expect(await storedValue(accountA2)).toBe(60);

      // After reloading, the list of versions read covers both rows and the save goes through.
      const reloaded = [elsewhere.headers.etag, untouched.headers.etag].join(", ");
      const again = await put(PAST, h.tokens.a, {
        values: [
          { accountId: accountA, value: 130 },
          { accountId: accountA2, value: 70 },
        ],
      }).set("If-Match", reloaded);
      expect(again.status).toBe(200);
      expect(await storedValue(accountA)).toBe(130);
      expect(await storedValue(accountA2)).toBe(70);
    });

    it("a repeat of a save whose answer was lost is accepted; a different figure is not", async () => {
      const first = await put(PAST, h.tokens.a, { values: [{ accountId: accountA, value: 100 }] });
      const read = first.headers.etag as string;
      await pause(5);
      const body = { values: [{ accountId: accountA, value: 140, source: "confirmed" }] };
      expect((await put(PAST, h.tokens.a, body).set("If-Match", read)).status).toBe(200);
      // The answer never arrived, so the client sends the same save with the version it read.
      await pause(5);
      expect((await put(PAST, h.tokens.a, body).set("If-Match", read)).status).toBe(200);
      expect(await storedValue(accountA)).toBe(140);
      // The same stale version with another figure, date or source is a real conflict.
      for (const value of [
        { accountId: accountA, value: 141, source: "confirmed" },
        { accountId: accountA, value: 140, source: "manual" },
        { accountId: accountA, value: 140, source: "confirmed", asOfDate: "2001-02-03" },
      ]) {
        const res = await put(PAST, h.tokens.a, { values: [value] }).set("If-Match", read);
        expect(res.status).toBe(412);
      }
      expect(await storedValue(accountA)).toBe(140);
      expect((await rowsFor(accountA))[0]?.source).toBe("confirmed");
    });

    it("a row that does not exist yet is always written, and the check-in flag is kept", async () => {
      const first = await put(PAST, h.tokens.a, { values: [{ accountId: accountA, value: 100 }] });
      const res = await put(PAST, h.tokens.a, {
        values: [{ accountId: accountA2, value: 50 }],
        complete: true,
      }).set("If-Match", first.headers.etag as string);
      expect(res.status).toBe(200);
      expect(res.body.completed).toBe(true);
      expect(await storedValue(accountA2)).toBe(50);
    });

    it("an If-Match that is not a list of this API's ETags is a 412; another user's account stays a 404", async () => {
      const first = await put(PAST, h.tokens.a, { values: [{ accountId: accountA, value: 100 }] });
      for (const junk of ["*", "abc", `${first.headers.etag}, *`]) {
        const res = await put(PAST, h.tokens.a, {
          values: [{ accountId: accountA, value: 101 }],
        }).set("If-Match", junk);
        expect(res.status).toBe(412);
      }
      expect(await storedValue(accountA)).toBe(100);
      // The ownership check comes first: B learns nothing about A's row from a 412.
      const foreign = await put(PAST, h.tokens.b, {
        values: [{ accountId: accountA, value: 1 }],
      }).set("If-Match", first.headers.etag as string);
      expect(foreign.status).toBe(404);
    });

    it("two saves that read the same version: one wins, the other is a 412", async () => {
      const first = await put(PAST, h.tokens.a, { values: [{ accountId: accountA, value: 100 }] });
      const read = first.headers.etag as string;
      await pause(5);
      const results = await Promise.all(
        [201, 202].map((value) =>
          put(PAST, h.tokens.a, { values: [{ accountId: accountA, value }] }).set("If-Match", read),
        ),
      );
      expect(results.map((r) => r.status).sort()).toEqual([200, 412]);
    });
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
