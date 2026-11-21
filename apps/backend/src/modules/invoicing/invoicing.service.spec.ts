import { ConflictException, NotFoundException, PreconditionFailedException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { Invoice } from "../../entities/invoice.entity";
import { InvoicingSettings } from "../../entities/invoicing-settings.entity";
import { TaxRecord } from "../../entities/tax-record.entity";
import { WorkLogEntry } from "../../entities/work-log-entry.entity";
import { InvoicingController } from "./invoicing.controller";
import { InvoicingService } from "./invoicing.service";

const OWNER_A = ["user", "01HZX3Q9V7C2M8N4P6R0S5T1WA"].join("_");
const OWNER_B = ["user", "01HZX3Q9V7C2M8N4P6R0S5T1WB"].join("_");
const T0 = new Date("2026-11-21T10:00:00.000Z");
const T1 = new Date("2026-11-21T11:00:00.000Z");

function createInMemoryHarness() {
  const settingsRows: InvoicingSettings[] = [];
  const workLogRows: WorkLogEntry[] = [];
  const invoiceRows: Invoice[] = [];
  const taxRecordRows: TaxRecord[] = [];
  let seq = 1;
  const nextUuid = () => `00000000-0000-4000-8000-${String(seq++).padStart(12, "0")}`;

  const matchesWhere = <T extends Record<string, unknown>>(
    row: T,
    where: Record<string, unknown>,
  ): boolean =>
    Object.entries(where).every(([key, expected]) => {
      if (
        expected &&
        typeof expected === "object" &&
        "_type" in (expected as Record<string, unknown>) &&
        (expected as { _type?: string })._type === "in"
      ) {
        const values = (expected as unknown as { _value: unknown[] })._value;
        return values.includes(row[key]);
      }
      return row[key] === expected;
    });

  const makeRepo = <T extends { id: string; userId: string; createdAt: Date; updatedAt: Date }>(
    target: unknown,
    store: T[],
  ) => {
    const repo = {
      target,
      findOne: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
        return store.find((r) => matchesWhere(r, where)) ?? null;
      }),
      find: vi.fn(async ({ where }: { where?: Record<string, unknown> } = {}) => {
        if (!where) return [...store];
        return store.filter((r) => matchesWhere(r, where));
      }),
      create: vi.fn((partial: Partial<T>) => ({
        ...partial,
        id: partial.id ?? nextUuid(),
        createdAt: partial.createdAt ?? T0,
        updatedAt: partial.updatedAt ?? T0,
      })),
      save: vi.fn(async (entity: T) => {
        const idx = store.findIndex((r) => r.id === entity.id);
        const saved = {
          ...entity,
          id: entity.id ?? nextUuid(),
          createdAt: entity.createdAt ?? T0,
          updatedAt: entity.updatedAt ?? T0,
        };
        if (idx >= 0) store[idx] = saved;
        else store.push(saved);
        return saved;
      }),
      delete: vi.fn(async (where: Record<string, unknown>) => {
        const before = store.length;
        for (let i = store.length - 1; i >= 0; i--) {
          const item = store[i];
          if (item && matchesWhere(item, where)) store.splice(i, 1);
        }
        return { affected: before - store.length };
      }),
      createQueryBuilder: undefined as unknown,
      manager: {
        transaction: async <R>(
          cb: (em: { getRepository: (t: unknown) => unknown }) => Promise<R>,
        ) =>
          cb({
            getRepository: (t: unknown) => {
              if (t === InvoicingSettings) return settingsRepo;
              if (t === WorkLogEntry) return workLogRepo;
              if (t === Invoice) return invoiceRepo;
              if (t === TaxRecord) return taxRecordRepo;
              throw new Error(`Unknown entity ${String(t)}`);
            },
          }),
      },
    };

    // Support claimVersion's queryBuilder
    const attachClaimQb = () => ({
      update: () => {
        let whereParams: Record<string, unknown> = {};
        return {
          set: () => ({
            where: (_sql: string, params: Record<string, unknown>) => {
              whereParams = params;
              return {
                execute: async () => {
                  const row = store.find(
                    (r) => r.id === whereParams.id && r.userId === whereParams.userId,
                  );
                  if (!row) return { affected: 0 };
                  if (row.updatedAt.toISOString() === whereParams.expectedVersion) {
                    row.updatedAt = T1;
                    return { affected: 1 };
                  }
                  return { affected: 0 };
                },
              };
            },
          }),
        };
      },
      where: (_sql: string, params: Record<string, unknown>) => ({
        getCount: async () =>
          store.filter((r) => r.id === params.id && r.userId === params.userId).length,
      }),
    });

    // Only used by claimVersion when called as createQueryBuilder() or createQueryBuilder("t")
    Object.defineProperty(repo, "createQueryBuilder", {
      value: (alias?: string) => {
        if (!alias || alias === "t") return attachClaimQb();
        throw new Error("Keyset query builder not used in memory repo");
      },
    });

    return repo;
  };

  const settingsRepo = makeRepo<InvoicingSettings>(InvoicingSettings, settingsRows);
  const workLogRepo = makeRepo<WorkLogEntry>(WorkLogEntry, workLogRows);
  const invoiceRepo = makeRepo<Invoice>(Invoice, invoiceRows);
  const taxRecordRepo = makeRepo<TaxRecord>(TaxRecord, taxRecordRows);

  // Use plain array filtering in listWorkLogs / listInvoices while keeping claimVersion working
  const wrapForList = <T extends Record<string, unknown>>(repo: T): T =>
    new Proxy(repo, {
      get(target, prop, receiver) {
        if (prop === "createQueryBuilder") {
          const stack = new Error().stack ?? "";
          if (stack.includes("listWorkLogs") || stack.includes("listInvoices")) {
            return undefined;
          }
        }
        return Reflect.get(target, prop, receiver);
      },
    });

  const service = new InvoicingService(
    settingsRepo as never,
    wrapForList(workLogRepo) as never,
    wrapForList(invoiceRepo) as never,
  );
  const controller = new InvoicingController(service);

  return { service, controller, settingsRows, workLogRows, invoiceRows, taxRecordRows };
}

describe("InvoicingService & InvoicingController (E37 S1)", () => {
  it("returns default unsaved settings and updates settings with If-Match optimistic concurrency", async () => {
    const { controller } = createInMemoryHarness();
    const req = { user: { id: OWNER_A } } as never;

    const initial = await controller.getSettings(req);
    expect(initial.settings).toEqual({
      id: null,
      defaultHourlyRate: null,
      businessName: null,
      businessAddress: null,
      businessEmail: null,
      vatNumber: null,
      invoicePrefix: "INV-",
      nextInvoiceSequence: 1,
      defaultPaymentTermsDays: 30,
      createdAt: null,
      updatedAt: null,
    });

    // Stale If-Match when no row exists yet throws 412 Precondition Failed
    await expect(
      controller.updateSettings(req, { defaultHourlyRate: 80 }, `"${T0.toISOString()}"`),
    ).rejects.toBeInstanceOf(PreconditionFailedException);

    // First save without If-Match creates the row
    const headers: Record<string, string> = {};
    const res = {
      setHeader: (k: string, v: string) => {
        headers[k] = v;
      },
    } as never;

    const saved = await controller.updateSettings(
      req,
      {
        defaultHourlyRate: 85,
        businessName: "Studio North Ltd",
        vatNumber: "GB123456789",
        invoicePrefix: "SN-",
        defaultPaymentTermsDays: 14,
      },
      undefined,
      res,
    );
    expect(saved.settings.defaultHourlyRate).toBe(85);
    expect(saved.settings.businessName).toBe("Studio North Ltd");
    expect(saved.settings.vatNumber).toBe("GB123456789");
    expect(saved.settings.invoicePrefix).toBe("SN-");
    expect(saved.settings.defaultPaymentTermsDays).toBe(14);
    expect(headers.ETag).toBe(`"${T0.toISOString()}"`);

    // Matching If-Match succeeds; mismatched If-Match throws 412
    await expect(
      controller.updateSettings(req, { defaultHourlyRate: 90 }, '"2026-01-01T00:00:00.000Z"'),
    ).rejects.toBeInstanceOf(PreconditionFailedException);

    const updated = await controller.updateSettings(
      req,
      { defaultHourlyRate: 95 },
      `"${T0.toISOString()}"`,
      res,
    );
    expect(updated.settings.defaultHourlyRate).toBe(95);
    expect(headers.ETag).toBe(`"${T1.toISOString()}"`);
  });

  it("creates, filters, updates, and deletes work log entries and enforces If-Match 412", async () => {
    const { controller } = createInMemoryHarness();
    const reqA = { user: { id: OWNER_A } } as never;
    const reqB = { user: { id: OWNER_B } } as never;

    // Working: 7.5 hours x £65.00 = £487.50
    const created = await controller.createWorkLog(reqA, {
      date: "2026-11-10",
      description: "Design system tokens",
      hoursWorked: 7.5,
      hourlyRate: 65,
      clientName: "Acme Corp",
      incomeSource: "self-employed",
    });
    expect(created.entry.amount).toBe(487.5);
    expect(created.entry.invoiceId).toBeNull();

    // User B cannot see, edit, or delete User A's work log entry
    const listB = await controller.listWorkLogs(reqB, {});
    expect(listB.entries).toEqual([]);
    await expect(
      controller.updateWorkLog(reqB, created.entry.id, { hoursWorked: 1 }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(controller.deleteWorkLog(reqB, created.entry.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );

    // Stale If-Match on PATCH /work-logs/:id returns 412 Precondition Failed
    await expect(
      controller.updateWorkLog(
        reqA,
        created.entry.id,
        { hoursWorked: 8 },
        '"2026-01-01T00:00:00.000Z"',
      ),
    ).rejects.toBeInstanceOf(PreconditionFailedException);

    // Valid If-Match updates and recalculates amount: 8 hours x £70.00 = £560.00
    const updated = await controller.updateWorkLog(
      reqA,
      created.entry.id,
      { hoursWorked: 8, hourlyRate: 70 },
      `"${T0.toISOString()}"`,
    );
    expect(updated.entry.amount).toBe(560);

    // Filtering by billed=false includes the unbilled entry; billed=true excludes it
    const unbilled = await controller.listWorkLogs(reqA, { billed: "false" });
    expect(unbilled.entries).toHaveLength(1);
    const billed = await controller.listWorkLogs(reqA, { billed: "true" });
    expect(billed.entries).toHaveLength(0);

    const deleted = await controller.deleteWorkLog(reqA, created.entry.id);
    expect(deleted).toEqual({ id: created.entry.id });
    expect((await controller.listWorkLogs(reqA, {})).entries).toEqual([]);
  });

  it("enforces invoice lifecycle, VAT calculation, work-log locking (409), and void unlinking", async () => {
    const { controller } = createInMemoryHarness();
    const req = { user: { id: OWNER_A } } as never;

    const e1 = (
      await controller.createWorkLog(req, {
        date: "2026-11-01",
        description: "Phase 1 discovery",
        hoursWorked: 10,
        hourlyRate: 62.5,
      })
    ).entry;
    const e2 = (
      await controller.createWorkLog(req, {
        date: "2026-11-02",
        description: "Phase 2 build",
        hoursWorked: 10,
        hourlyRate: 62.5,
      })
    ).entry;

    // Create draft invoice with 20% VAT (Section 10 worked example 1: £1,250 subtotal, £250 VAT, £1,500 total)
    const draftRes = await controller.createInvoice(req, {
      workLogEntryIds: [e1.id, e2.id],
      clientName: "Britannia Media Ltd",
      clientEmail: "accounts@britannia.example",
      issueDate: "2026-11-15",
      vatRatePct: 20,
    });
    const draft = draftRes.invoice;
    expect(draft.invoiceNumber).toBe("INV-0001");
    expect(draft.status).toBe("draft");
    expect(draft.dueDate).toBe("2026-12-15");
    expect(draft.taxYear).toBe("2026/27");
    expect(draft.subtotal).toBe(1250);
    expect(draft.vatRatePct).toBe(20);
    expect(draft.vatAmount).toBe(250);
    expect(draft.total).toBe(1500);
    expect(draft.entries.map((e) => e.id)).toEqual([e1.id, e2.id]);

    // Settings nextInvoiceSequence incremented to 2
    expect((await controller.getSettings(req)).settings.nextInvoiceSequence).toBe(2);

    // Double-invoicing an already linked work log entry returns 409 Conflict
    await expect(
      controller.createInvoice(req, {
        workLogEntryIds: [e1.id],
        clientName: "Duplicate Client",
        issueDate: "2026-11-16",
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    // Editing or deleting a work log entry while attached to a non-void invoice returns 409 Conflict
    await expect(
      controller.updateWorkLog(req, e1.id, { description: "Tamper" }),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(controller.deleteWorkLog(req, e1.id)).rejects.toBeInstanceOf(ConflictException);

    // Updating the draft invoice with stale If-Match returns 412 Precondition Failed
    await expect(
      controller.updateInvoice(
        req,
        draft.id,
        { clientName: "Updated Name" },
        '"2026-01-01T00:00:00.000Z"',
      ),
    ).rejects.toBeInstanceOf(PreconditionFailedException);

    // Issue the invoice (draft -> issued)
    const issued = (await controller.issueInvoice(req, draft.id)).invoice;
    expect(issued.status).toBe("issued");

    // Issued invoice cannot be edited or deleted (409 Conflict)
    await expect(
      controller.updateInvoice(req, draft.id, { clientName: "Cannot edit issued" }),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(controller.deleteInvoice(req, draft.id)).rejects.toBeInstanceOf(ConflictException);

    // Void the issued invoice -> status becomes void AND linked work logs are unlinked in one transaction
    const voided = (await controller.voidInvoice(req, draft.id)).invoice;
    expect(voided.status).toBe("void");
    expect(voided.entries).toEqual([]);
    expect(voided.subtotal).toBe(1250);
    expect(voided.vatAmount).toBe(250);
    expect(voided.total).toBe(1500);

    // Now the unlinked work logs have invoiceId === null and can be edited or billed on a new invoice
    const afterVoidLogs = (await controller.listWorkLogs(req, { billed: "false" })).entries;
    expect(afterVoidLogs.map((e) => e.id).sort()).toEqual([e1.id, e2.id].sort());

    const editedE1 = await controller.updateWorkLog(req, e1.id, {
      hoursWorked: 3.33,
      hourlyRate: 100.1,
    });
    expect(editedE1.entry.amount).toBe(333.33);

    // Re-invoice e1 on INV-0002 (Section 10 worked example 2: £333.33 at 20% -> £66.67 VAT, £400.00 total)
    const secondDraft = (
      await controller.createInvoice(req, {
        workLogEntryIds: [e1.id],
        clientName: "Britannia Media Ltd",
        issueDate: "2026-11-20",
        vatRatePct: 20,
      })
    ).invoice;
    expect(secondDraft.invoiceNumber).toBe("INV-0002");
    expect(secondDraft.subtotal).toBe(333.33);
    expect(secondDraft.vatAmount).toBe(66.67);
    expect(secondDraft.total).toBe(400);

    // Issue and mark paid
    await controller.issueInvoice(req, secondDraft.id);
    const paid = (await controller.markInvoicePaid(req, secondDraft.id, { paidDate: "2026-11-21" }))
      .invoice;
    expect(paid.status).toBe("paid");
    expect(paid.paidDate).toBe("2026-11-21");

    // Paid invoice cannot be voided or marked paid again
    await expect(controller.voidInvoice(req, secondDraft.id)).rejects.toBeInstanceOf(
      ConflictException,
    );
    await expect(
      controller.markInvoicePaid(req, secondDraft.id, { paidDate: "2026-11-22" }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("allows deleting a draft invoice and unlinks its work log entries", async () => {
    const { controller } = createInMemoryHarness();
    const req = { user: { id: OWNER_A } } as never;

    const entry = (
      await controller.createWorkLog(req, {
        date: "2026-11-18",
        description: "Advisory call",
        hoursWorked: 2,
        hourlyRate: 100,
      })
    ).entry;

    const draft = (
      await controller.createInvoice(req, {
        workLogEntryIds: [entry.id],
        clientName: "Draft Client",
        issueDate: "2026-11-18",
      })
    ).invoice;
    expect(draft.vatRatePct).toBeNull();
    expect(draft.vatAmount).toBe(0);
    expect(draft.total).toBe(200);

    const removed = await controller.deleteInvoice(req, draft.id);
    expect(removed).toEqual({ id: draft.id });

    const logs = (await controller.listWorkLogs(req, {})).entries;
    expect(logs[0]?.invoiceId).toBeNull();
  });

  it("syncInvoiceToTax creates a single Self Assessment income row using subtotal (ex-VAT), enforces paid status and If-Match, and is idempotent", async () => {
    const { controller, taxRecordRows } = createInMemoryHarness();
    const req = { user: { id: OWNER_A } } as never;
    const otherReq = { user: { id: OWNER_B } } as never;

    const entry = (
      await controller.createWorkLog(req, {
        date: "2026-11-18",
        description: "System design",
        hoursWorked: 12.5,
        hourlyRate: 100,
      })
    ).entry;

    // Subtotal 1250, 20% VAT -> 250 VAT, 1500 total
    const draft = (
      await controller.createInvoice(req, {
        workLogEntryIds: [entry.id],
        clientName: "Acme Ltd",
        issueDate: "2026-11-18",
        vatRatePct: 20,
      })
    ).invoice;
    expect(draft.subtotal).toBe(1250);
    expect(draft.total).toBe(1500);

    // Rejects draft / issued invoices with 409 Conflict
    await expect(controller.syncInvoiceToTax(req, draft.id)).rejects.toBeInstanceOf(
      ConflictException,
    );
    await controller.issueInvoice(req, draft.id);
    await expect(controller.syncInvoiceToTax(req, draft.id)).rejects.toBeInstanceOf(
      ConflictException,
    );

    const paid = (await controller.markInvoicePaid(req, draft.id, { paidDate: "2026-11-21" }))
      .invoice;

    // Rejects stale If-Match with 412 PreconditionFailedException
    await expect(
      controller.syncInvoiceToTax(req, paid.id, `"1999-01-01T00:00:00.000Z"`),
    ).rejects.toBeInstanceOf(PreconditionFailedException);

    // Rejects other user with 404 NotFoundException
    await expect(controller.syncInvoiceToTax(otherReq, paid.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );

    // Valid sync with current ETag creates one TaxRecord using subtotal (1250), not total (1500)
    const setHeader = vi.fn();
    const synced = (
      await controller.syncInvoiceToTax(req, paid.id, `"${paid.updatedAt}"`, {
        setHeader,
      } as never)
    ).invoice;
    expect(setHeader).toHaveBeenCalledWith("ETag", expect.any(String));
    expect(synced.taxRecordId).toBeTruthy();
    expect(taxRecordRows).toHaveLength(1);
    expect(taxRecordRows[0]).toMatchObject({
      id: synced.taxRecordId,
      userId: OWNER_A,
      type: "income",
      source: "self-employed",
      category: "Freelance / Invoice",
      name: "Invoice INV-0001 - Acme Ltd",
      amount: 1250,
      frequency: "one-off",
      date: "2026-11-21",
    });

    // Idempotent second call does not create a duplicate TaxRecord
    const syncedAgain = (await controller.syncInvoiceToTax(req, paid.id, `"${synced.updatedAt}"`))
      .invoice;
    expect(syncedAgain.taxRecordId).toBe(synced.taxRecordId);
    expect(taxRecordRows).toHaveLength(1);

    // If the referenced TaxRecord was deleted, re-syncing creates a fresh one
    taxRecordRows.splice(0, taxRecordRows.length);
    const resynced = (await controller.syncInvoiceToTax(req, paid.id, `"${syncedAgain.updatedAt}"`))
      .invoice;
    expect(taxRecordRows).toHaveLength(1);
    expect(resynced.taxRecordId).toBe(taxRecordRows[0]?.id);
  });
});
