import { ACCOUNT_EXPORT_SECTIONS } from "@flump/api-contract";
import { encryptReceiptData } from "@flump/banking/server";
import { describe, expect, it, vi } from "vitest";
import { AuditEvent } from "../../entities/audit-event.entity";
import {
  AccountExportService,
  csvExportFileName,
  ExportDeadlineError,
  isAccountExportKey,
} from "./account-export.service";

function createMockDataSource(options: {
  rowsByEntity?: Record<string, Record<string, unknown>[]>;
  auditInsertImpl?: () => Promise<unknown>;
}) {
  const events: string[] = [];
  const auditInsert = vi.fn(async () => {
    events.push("audit:user.exported");
    if (options.auditInsertImpl) return options.auditInsertImpl();
    return { identifiers: [{ id: "audit-1" }] };
  });
  const manager = {
    getRepository: (entity: { name: string }) => {
      const rows = options.rowsByEntity?.[entity.name] ?? [];
      const base = {
        findOne: vi.fn(async () => rows[0] ?? null),
        find: vi.fn(async ({ skip = 0, take = rows.length } = {}) => rows.slice(skip, skip + take)),
      };
      if (entity === AuditEvent || entity.name === "AuditEvent") {
        return { ...base, insert: auditInsert };
      }
      return base;
    },
    query: vi.fn(async () => []),
  };
  const dataSource = {
    manager,
    transaction: vi.fn(async (_isolation: string, cb: (m: typeof manager) => Promise<void>) => {
      events.push("tx:start");
      await cb(manager);
      events.push("tx:end");
    }),
  };
  return { dataSource, events, auditInsert };
}

describe("AccountExportService CSV export (E19 portability)", () => {
  it("formats CSV filenames and validates section keys", () => {
    const now = new Date("2026-11-16T09:00:00.000Z");
    expect(csvExportFileName(now)).toBe("flump-export-2026-11-16.csv");
    expect(csvExportFileName(now, "accounts")).toBe("flump-export-accounts-2026-11-16.csv");
    expect(isAccountExportKey("accounts")).toBe(true);
    expect(isAccountExportKey("transactions")).toBe(true);
    expect(isAccountExportKey("notASection")).toBe(false);
    expect(isAccountExportKey("__proto__")).toBe(false);
  });

  it("writes the user.exported audit row before the first CSV byte", async () => {
    const { dataSource, events } = createMockDataSource({
      rowsByEntity: {
        Account: [
          {
            id: "acc-1",
            name: '=HYPERLINK("http://evil","Current")',
            type: "Current",
            balance: "1200.50",
          },
        ],
      },
    });
    const service = new AccountExportService(dataSource as never);
    const chunks: string[] = [];

    await service.writeCsvExport(
      "user-1",
      async (chunk) => {
        events.push(`write:${chunks.length}`);
        chunks.push(chunk);
      },
      { section: "accounts" },
    );

    expect(events[0]).toBe("audit:user.exported");
    expect(events[1]).toBe("tx:start");
    expect(events[2]).toBe("write:0");
    const csv = chunks.join("");
    expect(csv.startsWith("id,name,type,balance")).toBe(true);
    expect(csv).toContain('"\'=HYPERLINK(""http://evil"",""Current"")"');
  });

  it("writes nothing if the user.exported audit insert fails", async () => {
    const { dataSource } = createMockDataSource({
      auditInsertImpl: () => Promise.reject(new Error("audit insert failed")),
    });
    const service = new AccountExportService(dataSource as never);
    const write = vi.fn(async () => undefined);

    await expect(service.writeCsvExport("user-1", write, { section: "accounts" })).rejects.toThrow(
      "audit insert failed",
    );
    expect(write).not.toHaveBeenCalled();
  });

  it("streams every ACCOUNT_EXPORT_SECTIONS table when section is omitted", async () => {
    const { dataSource } = createMockDataSource({
      rowsByEntity: {
        UserProfile: [{ userId: "user-1", currency: "GBP", country: "GB" }],
        Transaction: [
          {
            id: "tx-1",
            accountId: "acc-1",
            amount: -42.5,
            description: "+cmd|' /C calc'!A0",
            category: "Food, Drink",
            timestamp: new Date("2026-11-16T08:00:00.000Z"),
          },
        ],
      },
    });
    const service = new AccountExportService(dataSource as never);
    const chunks: string[] = [];

    await service.writeCsvExport("user-1", async (chunk) => {
      chunks.push(chunk);
    });

    const csv = chunks.join("");
    for (const key of Object.keys(ACCOUNT_EXPORT_SECTIONS)) {
      expect(csv).toContain(`section,${key}\r\n`);
    }
    expect(csv).toContain("'+cmd|' /C calc'!A0");
    expect(csv).toContain('"Food, Drink"');
    expect(csv).toContain("2026-11-16T08:00:00.000Z");
  });

  it("aborts with ExportDeadlineError when the client writer stalls", async () => {
    const { dataSource } = createMockDataSource({});
    const service = new AccountExportService(dataSource as never);

    await expect(
      service.writeCsvExport("user-1", () => new Promise(() => undefined), {
        section: "accounts",
        deadlineMs: 10,
      }),
    ).rejects.toBeInstanceOf(ExportDeadlineError);
  });
});

describe("AccountExportService receipts (SEC-D, L4)", () => {
  const RECORD_ID = "00000000-0000-4000-8000-0000000000ab";
  const plaintext = `data:application/pdf;base64,${Buffer.from("%PDF-1.4\n").toString("base64")}`;
  const ciphertext = encryptReceiptData(plaintext, RECORD_ID);
  const taxRow = () => ({
    id: RECORD_ID,
    name: "Receipt",
    receiptFilename: "r.pdf",
    receiptMimeType: "application/pdf",
    receiptData: ciphertext,
  });

  it("writes the decrypted receipt into the CSV, never the ciphertext envelope", async () => {
    const { dataSource } = createMockDataSource({ rowsByEntity: { TaxRecord: [taxRow()] } });
    const service = new AccountExportService(dataSource as never);
    const chunks: string[] = [];

    await service.writeCsvExport(
      "user-1",
      async (chunk) => {
        chunks.push(chunk);
      },
      { section: "taxRecords" },
    );

    const csv = chunks.join("");
    expect(csv).toContain(plaintext);
    expect(csv).not.toContain(ciphertext);
    expect(csv).not.toMatch(/v\d+:[0-9a-f]{24}:/);
  });

  it("shapes JSON and CSV rows the same way", async () => {
    const { dataSource } = createMockDataSource({ rowsByEntity: { TaxRecord: [taxRow()] } });
    const service = new AccountExportService(dataSource as never);
    const json: string[] = [];
    await service.writeExport("user-1", async (chunk) => {
      json.push(chunk);
    });
    const doc = JSON.parse(json.join("")) as { taxRecords: Array<Record<string, unknown>> };
    expect(doc.taxRecords[0]?.receiptData).toBe(plaintext);
  });
});
