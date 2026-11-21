import "reflect-metadata";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Invoice } from "../../src/entities/invoice.entity";
import { WorkLogEntry } from "../../src/entities/work-log-entry.entity";
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
} from "./support";

vi.mock("../../src/config/typeorm.options", async (importOriginal) =>
  (await import("./support.js")).withMigrations(await importOriginal()),
);

const dbMode = resolveDbTestMode(process.env);

describe.skipIf(dbMode === "skip")("authz: invoicing controller (real Postgres)", () => {
  let h: AuthzHarness;
  const exercised = new Set<string>();
  const ran = (key: string, kind: "authn" | "idor" = "idor") => exercised.add(`${key}:${kind}`);

  let workLogId: string;
  let invoiceId: string;

  const workLogs = () => h.dataSource.getRepository(WorkLogEntry);
  const invoices = () => h.dataSource.getRepository(Invoice);

  beforeAll(async () => {
    h = await bootAuthzHarness();
  }, 60_000);

  afterAll(async () => {
    const expected = Object.entries(ROUTE_MATRIX)
      .filter(([, row]) => row.status === "covered" && row.spec === "invoicing")
      .flatMap(([key]) => [`${key}:authn`, `${key}:idor`])
      .sort();
    expect([...exercised].sort()).toEqual(expected);
    await h?.close();
  });

  beforeEach(async () => {
    await truncateAll(h.dataSource);
    await h.resetRateLimits();

    const wl = await h.call("post", "/work-logs", h.tokens.a, {
      date: "2026-11-10",
      description: "A consulting",
      hoursWorked: 5,
      hourlyRate: 80,
    });
    expect(wl.status).toBe(201);
    workLogId = wl.body.entry.id;

    const wl2 = await h.call("post", "/work-logs", h.tokens.a, {
      date: "2026-11-11",
      description: "A invoice item",
      hoursWorked: 4,
      hourlyRate: 100,
    });
    expect(wl2.status).toBe(201);

    const inv = await h.call("post", "/invoices", h.tokens.a, {
      workLogEntryIds: [wl2.body.entry.id],
      clientName: "A Client",
      issueDate: "2026-11-15",
    });
    expect(inv.status).toBe(201);
    invoiceId = inv.body.invoice.id;
  });

  describe("authentication (every invoicing route)", () => {
    const routes: Array<{
      key: string;
      method: "get" | "post" | "patch" | "delete";
      path: () => string;
      body?: () => object;
    }> = [
      { key: "GET /invoicing/settings", method: "get", path: () => "/invoicing/settings" },
      {
        key: "PATCH /invoicing/settings",
        method: "patch",
        path: () => "/invoicing/settings",
        body: () => ({ defaultHourlyRate: 75 }),
      },
      { key: "GET /work-logs", method: "get", path: () => "/work-logs" },
      {
        key: "POST /work-logs",
        method: "post",
        path: () => "/work-logs",
        body: () => ({ date: "2026-11-12", description: "x", hoursWorked: 1, hourlyRate: 50 }),
      },
      {
        key: "PATCH /work-logs/:id",
        method: "patch",
        path: () => `/work-logs/${workLogId}`,
        body: () => ({ description: "pwned" }),
      },
      {
        key: "DELETE /work-logs/:id",
        method: "delete",
        path: () => `/work-logs/${workLogId}`,
      },
      { key: "GET /invoices", method: "get", path: () => "/invoices" },
      { key: "GET /invoices/:id", method: "get", path: () => `/invoices/${invoiceId}` },
      {
        key: "POST /invoices",
        method: "post",
        path: () => "/invoices",
        body: () => ({
          workLogEntryIds: [workLogId],
          clientName: "X",
          issueDate: "2026-11-15",
        }),
      },
      {
        key: "PATCH /invoices/:id",
        method: "patch",
        path: () => `/invoices/${invoiceId}`,
        body: () => ({ clientName: "pwned" }),
      },
      {
        key: "DELETE /invoices/:id",
        method: "delete",
        path: () => `/invoices/${invoiceId}`,
      },
      {
        key: "POST /invoices/:id/issue",
        method: "post",
        path: () => `/invoices/${invoiceId}/issue`,
        body: () => ({}),
      },
      {
        key: "POST /invoices/:id/mark-paid",
        method: "post",
        path: () => `/invoices/${invoiceId}/mark-paid`,
        body: () => ({ paidDate: "2026-11-20" }),
      },
      {
        key: "POST /invoices/:id/void",
        method: "post",
        path: () => `/invoices/${invoiceId}/void`,
        body: () => ({}),
      },
    ];

    it.each(routes.map((r) => [r.key, r] as const))(
      "%s: no, expired and dev-bypass tokens get 401",
      async (_key, route) => {
        for (const token of [undefined, h.tokens.expired, h.tokens.dev]) {
          const res = await h.call(route.method, route.path(), token, route.body?.());
          expect(res.status).toBe(401);
        }
        ran(route.key, "authn");
      },
    );
  });

  it("GET & PATCH /invoicing/settings: isolated per user", async () => {
    const setA = await h.call("patch", "/invoicing/settings", h.tokens.a, {
      defaultHourlyRate: 95,
      businessName: "A Biz",
    });
    expect(setA.status).toBe(200);

    const getB = await h.call("get", "/invoicing/settings", h.tokens.b);
    expect(getB.status).toBe(200);
    expect(getB.body.settings.businessName).toBeNull();
    expect(getB.body.settings.defaultHourlyRate).toBeNull();

    expectProbeRejected(
      await h.call("patch", "/invoicing/settings", h.tokens.b, {
        ...probeBody(setA.body.settings.id),
        businessName: "B",
      }),
    );

    ran("GET /invoicing/settings");
    ran("PATCH /invoicing/settings");
  });

  it("work-logs CRUD: B cannot read, update or delete A's entries", async () => {
    const listB = await h.call("get", "/work-logs", h.tokens.b);
    expect(listB.status).toBe(200);
    expect(listB.body.entries).toEqual([]);
    ran("GET /work-logs");

    expectProbeRejected(
      await h.call("post", "/work-logs", h.tokens.b, {
        ...probeBody(workLogId),
        date: "2026-11-10",
        description: "B",
        hoursWorked: 1,
        hourlyRate: 50,
      }),
    );
    ran("POST /work-logs");

    const patchB = await h.call("patch", `/work-logs/${workLogId}`, h.tokens.b, {
      description: "pwned",
    });
    const patchMissing = await h.call("patch", `/work-logs/${MISSING_ID}`, h.tokens.b, {
      description: "pwned",
    });
    expect(patchB.status).toBe(404);
    expect(sansRequestId(patchB.body)).toEqual(sansRequestId(patchMissing.body));
    ran("PATCH /work-logs/:id");

    const delB = await h.call("delete", `/work-logs/${workLogId}`, h.tokens.b);
    const delMissing = await h.call("delete", `/work-logs/${MISSING_ID}`, h.tokens.b);
    expect(delB.status).toBe(404);
    expect(sansRequestId(delB.body)).toEqual(sansRequestId(delMissing.body));
    expect((await workLogs().findOneBy({ id: workLogId }))?.userId).toBe(USER_A);
    ran("DELETE /work-logs/:id");
  });

  it("invoices CRUD and transitions: B cannot read, link A's work logs, edit, delete, issue, mark-paid or void A's invoice", async () => {
    const listB = await h.call("get", "/invoices", h.tokens.b);
    expect(listB.status).toBe(200);
    expect(listB.body.invoices).toEqual([]);
    ran("GET /invoices");

    const getB = await h.call("get", `/invoices/${invoiceId}`, h.tokens.b);
    const getMissing = await h.call("get", `/invoices/${MISSING_ID}`, h.tokens.b);
    expect(getB.status).toBe(404);
    expect(sansRequestId(getB.body)).toEqual(sansRequestId(getMissing.body));
    ran("GET /invoices/:id");

    // B cannot create an invoice referencing A's unbilled workLogId
    const createWithA = await h.call("post", "/invoices", h.tokens.b, {
      workLogEntryIds: [workLogId],
      clientName: "B Client",
      issueDate: "2026-11-15",
    });
    expect(createWithA.status).toBe(400);
    ran("POST /invoices");

    for (const [key, method, sub, body] of [
      ["PATCH /invoices/:id", "patch", "", { clientName: "pwned" }],
      ["DELETE /invoices/:id", "delete", "", undefined],
      ["POST /invoices/:id/issue", "post", "/issue", {}],
      ["POST /invoices/:id/mark-paid", "post", "/mark-paid", { paidDate: "2026-11-20" }],
      ["POST /invoices/:id/void", "post", "/void", {}],
    ] as const) {
      const asB = await h.call(method, `/invoices/${invoiceId}${sub}`, h.tokens.b, body);
      const missing = await h.call(method, `/invoices/${MISSING_ID}${sub}`, h.tokens.b, body);
      expect(asB.status).toBe(404);
      expect(sansRequestId(asB.body)).toEqual(sansRequestId(missing.body));
      ran(key);
    }

    expect((await invoices().findOneBy({ id: invoiceId }))?.userId).toBe(USER_A);
  });
});
