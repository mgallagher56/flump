import { decryptReceiptData, encryptReceiptData, isEncryptedToken } from "@flump/banking/server";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { createInMemoryRepository } from "../../testing/in-memory-repository";
import { annualRecordEndDate, TaxService } from "./tax.service";

const base = {
  type: "income",
  source: "paye",
  category: "paye_bonus",
  name: "Bonus",
  amount: 1000,
};

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

describe("TaxService finance costs brought forward records", () => {
  const bf = {
    type: "expense",
    source: "rental",
    category: "finance_costs_brought_forward",
    name: "Brought forward",
    amount: 1570,
    frequency: "annual",
    date: "2026-06-06",
  };

  it("refuses one that is not a yearly rental expense, even with the contract check off", async () => {
    const service = new TaxService(createInMemoryRepository() as never);
    await expect(
      service.createRecord("u1", { ...bf, frequency: "monthly" } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.createRecord("u1", { ...bf, source: "self-employed" } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("checks an update on the merged record, not only the fields sent", async () => {
    const service = new TaxService(createInMemoryRepository() as never);
    const created = await service.createRecord("u1", bf as never);
    // Each change alone looks harmless; on this record it would make it an income or monthly.
    await expect(
      service.updateRecord("u1", created.id, { type: "income" } as never, undefined),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.updateRecord("u1", created.id, { frequency: "monthly" } as never, undefined),
    ).rejects.toBeInstanceOf(BadRequestException);
    // An ordinary change still works.
    await expect(
      service.updateRecord("u1", created.id, { amount: 1000 } as never, undefined),
    ).resolves.toMatchObject({ amount: 1000 });
  });
});

describe("TaxService known categories (one list per source, from the engine)", () => {
  const rent = {
    type: "income",
    source: "rental",
    category: "rental_income",
    name: "Rent from the flat",
    amount: 1150,
    frequency: "monthly",
    date: "2026-04-06",
  };
  const categoryIssue = async (work: Promise<unknown>) => {
    const error = await work.then(
      () => null,
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(BadRequestException);
    return (error as BadRequestException).getResponse();
  };
  /** A row saved before the list existed, with a category no list holds. */
  const legacyRow = async (service: TaxService, repository: { save: (r: object) => unknown }) => {
    await repository.save({ ...rent, id: "legacy-1", userId: "u1", category: "Rent" });
    return service;
  };

  it("refuses an unknown category on create with a 400 on the category field, contract check off", async () => {
    const service = new TaxService(createInMemoryRepository() as never);
    const response = await categoryIssue(
      service.createRecord("u1", { ...rent, category: "Rent" } as never),
    );
    expect(response).toMatchObject({
      code: "validation_failed",
      issues: [{ path: "body.category", code: "custom" }],
    });
  });

  it("refuses a known category under the wrong source", async () => {
    const service = new TaxService(createInMemoryRepository() as never);
    await categoryIssue(service.createRecord("u1", { ...rent, source: "savings" } as never));
  });

  it("refuses a bulk request with one unknown category before opening a transaction", async () => {
    const { outside, transaction } = withManager();
    const service = new TaxService(outside as never);
    await categoryIssue(
      service.createBulk("u1", { records: [rent, { ...rent, category: "Repairs" }] } as never),
    );
    expect(transaction).not.toHaveBeenCalled();
  });

  it("keeps a stored row with an unlisted category readable, editable and deletable", async () => {
    const repository = createInMemoryRepository();
    const service = await legacyRow(new TaxService(repository as never), repository as never);
    await expect(service.getRecord("u1", "legacy-1")).resolves.toMatchObject({ category: "Rent" });
    // A change that does not touch the category or source is saved; the category is kept.
    await expect(
      service.updateRecord("u1", "legacy-1", { name: "Flat rent" } as never, undefined),
    ).resolves.toMatchObject({ name: "Flat rent", category: "Rent" });
    await expect(service.deleteRecord("u1", "legacy-1")).resolves.toEqual({ success: true });
  });

  it("fails an edit of that row only on the category field while it stays unlisted", async () => {
    const repository = createInMemoryRepository();
    const service = await legacyRow(new TaxService(repository as never), repository as never);
    // The edit form sends the whole record back, category included.
    const response = await categoryIssue(
      service.updateRecord(
        "u1",
        "legacy-1",
        { ...rent, category: "Rent", name: "Flat rent" } as never,
        undefined,
      ),
    );
    expect(response).toMatchObject({ issues: [{ path: "body.category" }] });
    // Choosing a listed category fixes it.
    await expect(
      service.updateRecord("u1", "legacy-1", { ...rent, name: "Flat rent" } as never, undefined),
    ).resolves.toMatchObject({ category: "rental_income" });
  });

  it("checks a source change against the stored category, on the merged record", async () => {
    const service = new TaxService(createInMemoryRepository() as never);
    const created = await service.createRecord("u1", rent as never);
    const response = await categoryIssue(
      service.updateRecord("u1", created.id, { source: "savings" } as never, undefined),
    );
    expect(response).toMatchObject({ issues: [{ path: "body.category" }] });
  });
});
