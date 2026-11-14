import "reflect-metadata";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { TaxRecord } from "../../src/entities/tax-record.entity";
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

// Migrations run on boot; see support.ts.
vi.mock("../../src/config/typeorm.options", async (importOriginal) =>
  (await import("./support.js")).withMigrations(await importOriginal()),
);

/**
 * Tax controller IDOR matrix (E20-N23), real AppModule on real Postgres: A 2xx, B 404 identical
 * to a genuine not-found with the row unchanged, 401 without a valid token, write bodies probed
 * with A's { id, userId }, lists free of A's rows. Includes the receipt download (N15) and the
 * bulk endpoint's capPreviousRecordIds, which must never reach another user's records.
 */
const dbMode = resolveDbTestMode(process.env);

const PDF_BYTES = Buffer.from("%PDF-1.4\nA private receipt\n");
const RECEIPT_DATA = `data:application/pdf;base64,${PDF_BYTES.toString("base64")}`;

const recordBody = (name: string, extra: object = {}) => ({
  type: "income",
  source: "paye",
  category: "salary",
  name,
  amount: 1000,
  frequency: "monthly",
  date: "2025-04-06",
  ...extra,
});

describe.skipIf(dbMode === "skip")("authz: tax controller (real Postgres)", () => {
  let h: AuthzHarness;
  const exercised = new Set<string>();
  const ran = (key: string, kind: "authn" | "idor" = "idor") => exercised.add(`${key}:${kind}`);

  let recordId: string;

  const records = () => h.dataSource.getRepository(TaxRecord);

  beforeAll(async () => {
    h = await bootAuthzHarness();
  }, 60_000);

  afterAll(async () => {
    const expected = Object.entries(ROUTE_MATRIX)
      .filter(([, row]) => row.status === "covered" && row.spec === "tax")
      .flatMap(([key]) => [`${key}:authn`, `${key}:idor`])
      .sort();
    expect([...exercised].sort()).toEqual(expected);
    await h?.close();
  });

  beforeEach(async () => {
    await truncateAll(h.dataSource);
    await h.resetRateLimits();
    const created = await h.call(
      "post",
      "/tax-records",
      h.tokens.a,
      recordBody("A salary", { receiptFilename: "a-payslip.pdf", receiptData: RECEIPT_DATA }),
    );
    expect(created.status).toBe(201);
    recordId = created.body.id;
  });

  /** A's row exactly as seeded, including the receipt bytes (select: false, so asked for). */
  const expectRecordUntouched = async () => {
    const row = await records().findOne({ where: { id: recordId }, select: { receiptData: true } });
    const full = await records().findOneBy({ id: recordId });
    expect(full?.userId).toBe(USER_A);
    expect(full?.name).toBe("A salary");
    expect(Number(full?.amount)).toBe(1000);
    expect(full?.endDate).toBeNull();
    expect(full?.receiptFilename).toBe("a-payslip.pdf");
    expect(row?.receiptData).toBe(RECEIPT_DATA);
  };

  const expectSameAsNotFound = async (method: "get" | "patch" | "delete", body?: object) => {
    const asB = await h.call(method, `/tax-records/${recordId}`, h.tokens.b, body);
    const missing = await h.call(method, `/tax-records/${MISSING_ID}`, h.tokens.b, body);
    expect(asB.status).toBe(404);
    expect(missing.status).toBe(404);
    expect(asB.body).toEqual(missing.body);
  };

  describe("authentication (every tax route)", () => {
    const routes: Array<{
      key: string;
      method: "get" | "post" | "patch" | "delete";
      path: () => string;
      body?: () => object;
    }> = [
      { key: "GET /tax-records", method: "get", path: () => "/tax-records" },
      { key: "GET /tax-records/:id", method: "get", path: () => `/tax-records/${recordId}` },
      {
        key: "GET /tax-records/:id/receipt",
        method: "get",
        path: () => `/tax-records/${recordId}/receipt`,
      },
      {
        key: "POST /tax-records/bulk",
        method: "post",
        path: () => "/tax-records/bulk",
        body: () => ({
          records: [recordBody("x")],
          capPreviousRecordIds: [{ id: recordId, endDate: "2030-01-01" }],
        }),
      },
      {
        key: "POST /tax-records",
        method: "post",
        path: () => "/tax-records",
        body: () => recordBody("x"),
      },
      {
        key: "PATCH /tax-records/:id",
        method: "patch",
        path: () => `/tax-records/${recordId}`,
        body: () => ({ name: "pwned" }),
      },
      { key: "DELETE /tax-records/:id", method: "delete", path: () => `/tax-records/${recordId}` },
    ];

    it.each(routes.map((r) => [r.key, r] as const))(
      "%s: no, expired and dev-bypass tokens get 401, data unchanged",
      async (_key, route) => {
        for (const token of [undefined, h.tokens.expired, h.tokens.dev]) {
          const res = await h.call(route.method, route.path(), token, route.body?.());
          expect(
            res.status,
            `${route.key} with ${token === undefined ? "no" : token === h.tokens.dev ? "dev-bypass" : "expired"} token`,
          ).toBe(401);
        }
        await expectRecordUntouched();
        expect(await records().count()).toBe(1);
        ran(route.key, "authn");
      },
    );
  });

  it("GET /tax-records: A sees own rows, B sees none of them", async () => {
    const a = await h.call("get", "/tax-records", h.tokens.a);
    expect(a.status).toBe(200);
    expect(a.body.map((r: { id: string }) => r.id)).toEqual([recordId]);
    expect(a.body[0]).not.toHaveProperty("receiptData");
    const b = await h.call("get", "/tax-records", h.tokens.b);
    expect(b.status).toBe(200);
    expect(b.body).toEqual([]);
    ran("GET /tax-records");
  });

  it("GET /tax-records/:id: A 200 without receipt bytes, B 404 identical to not-found", async () => {
    const own = await h.call("get", `/tax-records/${recordId}`, h.tokens.a);
    expect(own.status).toBe(200);
    expect(own.body.id).toBe(recordId);
    expect(own.body.hasReceipt).toBe(true);
    expect(own.body).not.toHaveProperty("receiptData");

    await expectSameAsNotFound("get");
    ran("GET /tax-records/:id");
  });

  it("GET /tax-records/:id/receipt: A downloads own bytes, B gets the not-found body", async () => {
    const own = await h.call("get", `/tax-records/${recordId}/receipt`, h.tokens.a).buffer(true);
    expect(own.status).toBe(200);
    expect(own.headers["content-type"]).toContain("application/pdf");
    expect(own.headers["cache-control"]).toBe("private, no-store");
    expect(Buffer.from(own.body).equals(PDF_BYTES)).toBe(true);

    const asB = await h.call("get", `/tax-records/${recordId}/receipt`, h.tokens.b);
    const missing = await h.call("get", `/tax-records/${MISSING_ID}/receipt`, h.tokens.b);
    expect(asB.status).toBe(404);
    expect(missing.status).toBe(404);
    expect(asB.body).toEqual(missing.body);
    // No receipt byte reaches B in any form.
    expect(asB.text).not.toContain("PDF");
    expect(asB.text).not.toContain(PDF_BYTES.toString("base64"));
    await expectRecordUntouched();
    ran("GET /tax-records/:id/receipt");
  });

  it("POST /tax-records: B's probe body cannot re-parent or overwrite A's row", async () => {
    const res = await h.call("post", "/tax-records", h.tokens.b, {
      ...probeBody(recordId),
      ...recordBody("B salary"),
    });
    expect(res.status).toBe(201);
    expect(res.body.userId).toBe(USER_B);
    expect(res.body.id).not.toBe(recordId);
    await expectRecordUntouched();
    expect(await records().findBy({ userId: USER_A })).toHaveLength(1);
    ran("POST /tax-records");
  });

  it("PATCH /tax-records/:id: A 200, B 404 identical to not-found, row unchanged", async () => {
    const own = await h.call("patch", `/tax-records/${recordId}`, h.tokens.a, { amount: 1200 });
    expect(own.status).toBe(200);
    expect(own.body.amount).toBe(1200);
    await records().update({ id: recordId }, { amount: 1000 });

    await expectSameAsNotFound("patch", {
      ...probeBody(recordId),
      name: "pwned",
      amount: 1,
      endDate: "2030-01-01",
      receiptData: null,
    });
    await expectRecordUntouched();
    ran("PATCH /tax-records/:id");
  });

  it("DELETE /tax-records/:id: B 404 identical to not-found, row kept; A 200 removes it", async () => {
    await expectSameAsNotFound("delete");
    await expectRecordUntouched();

    const own = await h.call("delete", `/tax-records/${recordId}`, h.tokens.a);
    expect(own.status).toBe(200);
    expect(await records().findOneBy({ id: recordId })).toBeNull();
    ran("DELETE /tax-records/:id");
  });

  describe("POST /tax-records/bulk", () => {
    it("creates only the caller's rows; a record carrying A's id/userId cannot overwrite A's", async () => {
      const res = await h.call("post", "/tax-records/bulk", h.tokens.b, {
        records: [{ ...probeBody(recordId), ...recordBody("B bulk 1") }, recordBody("B bulk 2")],
      });
      expect(res.status).toBe(201);
      expect(res.body).toHaveLength(2);
      for (const row of res.body) {
        expect(row.userId).toBe(USER_B);
        expect(row.id).not.toBe(recordId);
      }
      await expectRecordUntouched();
      expect(await records().findBy({ userId: USER_A })).toHaveLength(1);
      expect(await records().findBy({ userId: USER_B })).toHaveLength(2);
      ran("POST /tax-records/bulk");
    });

    it("capPreviousRecordIds: B cannot cap, reference or alter A's records", async () => {
      const bOwn = await h.call("post", "/tax-records", h.tokens.b, recordBody("B own"));
      expect(bOwn.status).toBe(201);

      // Cap-only chunk naming A's id (and a missing id) alongside B's own.
      const capOnly = await h.call("post", "/tax-records/bulk", h.tokens.b, {
        records: [],
        capPreviousRecordIds: [
          { id: recordId, endDate: "2030-01-01" },
          { id: MISSING_ID, endDate: "2030-01-01" },
          { id: bOwn.body.id, endDate: "2030-01-01" },
        ],
      });
      expect(capOnly.status).toBeLessThan(300);
      // Same outward result for A's id as for an id that does not exist: no signal either way.
      expect(capOnly.body).toEqual([]);
      await expectRecordUntouched();
      expect((await records().findOneBy({ id: bOwn.body.id }))?.endDate).toBe("2030-01-01");

      // Mixed chunk: creates and caps together, A's id still untouched and not echoed back.
      const mixed = await h.call("post", "/tax-records/bulk", h.tokens.b, {
        records: [recordBody("B mixed")],
        capPreviousRecordIds: [{ id: recordId, endDate: "2031-01-01" }],
      });
      expect(mixed.status).toBe(201);
      expect(mixed.text).not.toContain(recordId);
      await expectRecordUntouched();
      expect(await records().findBy({ userId: USER_A })).toHaveLength(1);
    });

    it("capPreviousRecordIds: A can cap own record (control)", async () => {
      const res = await h.call("post", "/tax-records/bulk", h.tokens.a, {
        records: [],
        capPreviousRecordIds: [{ id: recordId, endDate: "2030-01-01" }],
      });
      expect(res.status).toBeLessThan(300);
      expect((await records().findOneBy({ id: recordId }))?.endDate).toBe("2030-01-01");
    });

    it("capPreviousRecordIds: a malformed item is a 400 and applies no caps", async () => {
      const res = await h.call("post", "/tax-records/bulk", h.tokens.a, {
        records: [],
        capPreviousRecordIds: [{ id: recordId, endDate: "2030-01-01" }, { id: 5 }],
      });
      expect(res.status).toBe(400);
      await expectRecordUntouched();
    });
  });
});
