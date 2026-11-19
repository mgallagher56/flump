import { decryptReceiptData, encryptReceiptData, isEncryptedToken } from "@flump/banking/server";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { createInMemoryRepository } from "../../testing/in-memory-repository";
import { annualRecordEndDate, TaxService } from "./tax.service";

const base = { type: "income", source: "paye", category: "salary", name: "Pay", amount: 1000 };

/** An in-memory repository whose manager runs `work` against a separate transactional copy. */
const withManager = () => {
  const outside = createInMemoryRepository();
  const inside = createInMemoryRepository();
  const transaction = vi.fn(async (work: (em: unknown) => Promise<unknown>) =>
    work({ getRepository: () => inside }),
  );
  Object.assign(outside, { manager: { transaction } });
  return { outside, inside, transaction };
};

describe("annualRecordEndDate (audit M1)", () => {
  it("ends the UK tax year that contains the date, which starts on 6 April", () => {
    expect(annualRecordEndDate("2026-04-03")).toBe("2026-04-05"); // 2025/26
    expect(annualRecordEndDate("2026-04-05")).toBe("2026-04-05");
    expect(annualRecordEndDate("2026-04-06")).toBe("2027-04-05"); // 2026/27
    expect(annualRecordEndDate("2026-01-31")).toBe("2026-04-05");
    expect(annualRecordEndDate("2026-12-31")).toBe("2027-04-05");
  });
});

describe("TaxService.createBulk (audit M3)", () => {
  it("writes caps and records through one transaction's repository", async () => {
    const { outside, inside, transaction } = withManager();
    const service = new TaxService(outside as never);

    const created = await service.createBulk("u1", {
      records: [{ ...base, frequency: "annual", date: "2026-04-03" } as never],
      capPreviousRecordIds: [{ id: "00000000-0000-4000-8000-000000000001", endDate: "2026-04-05" }],
    });

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({ userId: "u1", endDate: "2026-04-05", hasReceipt: false });
    expect(inside.rows).toHaveLength(1);
    expect(outside.rows).toHaveLength(0);
  });

  it("refuses a salary record with a 400 even with the contract check off (slice 6)", async () => {
    const { outside, transaction } = withManager();
    const service = new TaxService(outside as never);
    await expect(
      service.createBulk("u1", {
        records: [{ ...base, source: "paye", category: "paye_salary", date: "2026-05-01" }],
      } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(transaction).not.toHaveBeenCalled();
    await expect(
      service.createRecord("u1", { ...base, source: "paye", category: "paye_salary" } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects a cap id that is not a uuid with a 400 before opening a transaction", async () => {
    const { outside, transaction } = withManager();
    const service = new TaxService(outside as never);
    await expect(
      service.createBulk("u1", {
        records: [{ ...base, date: "2026-05-01" }],
        capPreviousRecordIds: [{ id: "not-a-uuid", endDate: "2026-04-05" }],
      } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(transaction).not.toHaveBeenCalled();
  });

  it("validates everything before opening the transaction", async () => {
    const { outside, transaction } = withManager();
    const service = new TaxService(outside as never);

    await expect(
      service.createBulk("u1", {
        records: [{ ...base, frequency: "monthly", date: "2026-02-30" } as never],
      }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.createBulk("u1", {
        records: [],
        capPreviousRecordIds: [{ id: "x", endDate: "not-a-date" }],
      }),
    ).rejects.toThrow(BadRequestException);
    expect(transaction).not.toHaveBeenCalled();
  });

  it("opens no transaction for an empty request", async () => {
    const { outside, transaction } = withManager();
    expect(await new TaxService(outside as never).createBulk("u1", { records: [] })).toEqual([]);
    expect(transaction).not.toHaveBeenCalled();
  });

  it("propagates a failed write so the transaction rolls back", async () => {
    const outside = createInMemoryRepository();
    const failing = {
      update: vi.fn().mockResolvedValue({ affected: 1 }),
      create: (rows: unknown) => rows,
      save: vi.fn().mockRejectedValue(new Error("insert failed")),
    };
    Object.assign(outside, {
      manager: {
        transaction: (work: (em: unknown) => Promise<unknown>) =>
          work({ getRepository: () => failing }),
      },
    });

    await expect(
      new TaxService(outside as never).createBulk("u1", {
        records: [{ ...base, frequency: "monthly", date: "2026-05-01" } as never],
        capPreviousRecordIds: [
          { id: "00000000-0000-4000-8000-000000000001", endDate: "2026-04-05" },
        ],
      }),
    ).rejects.toThrow("insert failed");
    expect(failing.update).toHaveBeenCalledTimes(1);
  });
});

describe("TaxService.readReceipt (SEC-D, L4 legacy plaintext)", () => {
  const RECORD_ID = "00000000-0000-4000-8000-0000000000aa";
  // A minimal PDF: the magic bytes are all the sniffer checks.
  const pdfDataUrl = `data:application/pdf;base64,${Buffer.from("%PDF-1.4\n").toString("base64")}`;

  const repoWith = (receiptData: string) => {
    const qb = {
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      execute: vi.fn().mockResolvedValue({ affected: 1 }),
    };
    const repo = {
      findOne: vi.fn().mockResolvedValue({
        id: RECORD_ID,
        receiptFilename: "receipt.pdf",
        receiptMimeType: "application/pdf",
        receiptData,
      }),
      createQueryBuilder: vi.fn().mockReturnValue(qb),
    };
    return { repo, qb };
  };

  it("serves a legacy plaintext receipt and writes back its encrypted form, not a 404", async () => {
    const { repo, qb } = repoWith(pdfDataUrl);
    const service = new TaxService(repo as never);

    const file = await service.readReceipt("u1", RECORD_ID);

    expect(file.type).toBe("application/pdf");
    expect(file.bytes.toString("latin1").startsWith("%PDF-")).toBe(true);
    expect(qb.execute).toHaveBeenCalledTimes(1);
    const written = qb.set.mock.calls[0]?.[0] as { receiptData: string; updatedAt: () => string };
    expect(isEncryptedToken(written.receiptData)).toBe(true);
    expect(decryptReceiptData(written.receiptData, RECORD_ID)).toBe(pdfDataUrl);
    // A read is not an edit: the row's version (ETag) stays as it was.
    expect(written.updatedAt()).toBe('"updated_at"');
    // Only the row still holding that plaintext is rewritten (a concurrent upload wins).
    expect(qb.where.mock.calls[0]?.[1]).toEqual({
      id: RECORD_ID,
      userId: "u1",
      plaintext: pdfDataUrl,
    });
  });

  it("still serves the receipt when the write-back fails", async () => {
    const { repo, qb } = repoWith(pdfDataUrl);
    qb.execute.mockRejectedValue(new Error("db down"));
    const service = new TaxService(repo as never);
    await expect(service.readReceipt("u1", RECORD_ID)).resolves.toMatchObject({
      type: "application/pdf",
    });
  });

  it("does not rewrite a receipt that is already encrypted", async () => {
    const { repo, qb } = repoWith(encryptReceiptData(pdfDataUrl, RECORD_ID));
    const service = new TaxService(repo as never);
    await expect(service.readReceipt("u1", RECORD_ID)).resolves.toMatchObject({
      type: "application/pdf",
    });
    expect(qb.execute).not.toHaveBeenCalled();
  });

  it("is a 404 for legacy plaintext that fails the receipt rules, and leaves it alone", async () => {
    const { repo, qb } = repoWith("data:application/pdf;base64,AAAA");
    const service = new TaxService(repo as never);
    await expect(service.readReceipt("u1", RECORD_ID)).rejects.toBeInstanceOf(NotFoundException);
    expect(qb.execute).not.toHaveBeenCalled();
  });
});
