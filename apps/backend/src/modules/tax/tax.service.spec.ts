import { decryptReceiptData, encryptReceiptData, isEncryptedToken } from "@flump/banking/server";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { createInMemoryRepository } from "../../testing/in-memory-repository";
import { annualRecordEndDate, MAX_BULK_TAX_RECORDS, TaxService } from "./tax.service";

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
    const service = new TaxService(outside as never, createInMemoryRepository() as never);

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
    const service = new TaxService(outside as never, createInMemoryRepository() as never);
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
    const service = new TaxService(outside as never, createInMemoryRepository() as never);
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
    const service = new TaxService(outside as never, createInMemoryRepository() as never);

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
    expect(
      await new TaxService(outside as never, createInMemoryRepository() as never).createBulk("u1", {
        records: [],
      }),
    ).toEqual([]);
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
      new TaxService(outside as never, createInMemoryRepository() as never).createBulk("u1", {
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
    const service = new TaxService(repo as never, createInMemoryRepository() as never);

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
    const service = new TaxService(repo as never, createInMemoryRepository() as never);
    await expect(service.readReceipt("u1", RECORD_ID)).resolves.toMatchObject({
      type: "application/pdf",
    });
  });

  it("does not rewrite a receipt that is already encrypted", async () => {
    const { repo, qb } = repoWith(encryptReceiptData(pdfDataUrl, RECORD_ID));
    const service = new TaxService(repo as never, createInMemoryRepository() as never);
    await expect(service.readReceipt("u1", RECORD_ID)).resolves.toMatchObject({
      type: "application/pdf",
    });
    expect(qb.execute).not.toHaveBeenCalled();
  });

  it("is a 404 for legacy plaintext that fails the receipt rules, and leaves it alone", async () => {
    const { repo, qb } = repoWith("data:application/pdf;base64,AAAA");
    const service = new TaxService(repo as never, createInMemoryRepository() as never);
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
    const service = new TaxService(
      createInMemoryRepository() as never,
      createInMemoryRepository() as never,
    );
    await expect(
      service.createRecord("u1", { ...bf, frequency: "monthly" } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.createRecord("u1", { ...bf, source: "self-employed" } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("checks an update on the merged record, not only the fields sent", async () => {
    const service = new TaxService(
      createInMemoryRepository() as never,
      createInMemoryRepository() as never,
    );
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
    const service = new TaxService(
      createInMemoryRepository() as never,
      createInMemoryRepository() as never,
    );
    const response = await categoryIssue(
      service.createRecord("u1", { ...rent, category: "Rent" } as never),
    );
    expect(response).toMatchObject({
      code: "validation_failed",
      issues: [{ path: "body.category", code: "custom" }],
    });
  });

  it("refuses a known category under the wrong source", async () => {
    const service = new TaxService(
      createInMemoryRepository() as never,
      createInMemoryRepository() as never,
    );
    await categoryIssue(service.createRecord("u1", { ...rent, source: "savings" } as never));
  });

  it("refuses a bulk request with one unknown category before opening a transaction", async () => {
    const { outside, transaction } = withManager();
    const service = new TaxService(outside as never, createInMemoryRepository() as never);
    await categoryIssue(
      service.createBulk("u1", { records: [rent, { ...rent, category: "Repairs" }] } as never),
    );
    expect(transaction).not.toHaveBeenCalled();
  });

  it("keeps a stored row with an unlisted category readable, editable and deletable", async () => {
    const repository = createInMemoryRepository();
    const service = await legacyRow(
      new TaxService(repository as never, createInMemoryRepository() as never),
      repository as never,
    );
    await expect(service.getRecord("u1", "legacy-1")).resolves.toMatchObject({ category: "Rent" });
    // A change that does not touch the category or source is saved; the category is kept.
    await expect(
      service.updateRecord("u1", "legacy-1", { name: "Flat rent" } as never, undefined),
    ).resolves.toMatchObject({ name: "Flat rent", category: "Rent" });
    await expect(service.deleteRecord("u1", "legacy-1")).resolves.toEqual({ success: true });
  });

  it("fails an edit of that row only on the category field while it stays unlisted", async () => {
    const repository = createInMemoryRepository();
    const service = await legacyRow(
      new TaxService(repository as never, createInMemoryRepository() as never),
      repository as never,
    );
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
    const service = new TaxService(
      createInMemoryRepository() as never,
      createInMemoryRepository() as never,
    );
    const created = await service.createRecord("u1", rent as never);
    const response = await categoryIssue(
      service.updateRecord("u1", created.id, { source: "savings" } as never, undefined),
    );
    expect(response).toMatchObject({ issues: [{ path: "body.category" }] });
  });
});

describe("TaxService stores the category trimmed (contract check off)", () => {
  it("saves a padded listed category without the spaces, so the engine counts it", async () => {
    const service = new TaxService(
      createInMemoryRepository() as never,
      createInMemoryRepository() as never,
    );
    const created = await service.createRecord("u1", {
      type: "expense",
      source: "rental",
      category: " repairs_maintenance ",
      name: "Boiler",
      amount: 300,
      date: "2026-06-01",
    } as never);
    expect(created.category).toBe("repairs_maintenance");
  });
});

describe("TaxService account links (slice 7)", () => {
  const RENTAL = "00000000-0000-4000-8000-0000000000a1";
  const BTL = "00000000-0000-4000-8000-0000000000a2";
  const SAVER = "00000000-0000-4000-8000-0000000000a3";
  const ISA = "00000000-0000-4000-8000-0000000000a4";
  const HOME = "00000000-0000-4000-8000-0000000000a5";
  const CURRENT = "00000000-0000-4000-8000-0000000000a6";
  const THEIRS = "00000000-0000-4000-8000-0000000000b1";
  const MISSING = "00000000-0000-4000-8000-0000000000ff";

  const accounts = () =>
    createInMemoryRepository([
      { id: RENTAL, userId: "u1", type: "Property", accountSubtype: "rental" },
      { id: BTL, userId: "u1", type: "Mortgage", accountSubtype: "btl_mortgage" },
      { id: SAVER, userId: "u1", type: "Saving", accountSubtype: "easy_access" },
      { id: ISA, userId: "u1", type: "Investment", accountSubtype: "stocks_and_shares_isa" },
      { id: HOME, userId: "u1", type: "Property", accountSubtype: "home" },
      { id: CURRENT, userId: "u1", type: "Current", accountSubtype: null },
      { id: THEIRS, userId: "u2", type: "Property", accountSubtype: "rental" },
    ]);

  const setup = () => {
    const records = createInMemoryRepository();
    const service = new TaxService(records as never, accounts() as never);
    return { records, service };
  };

  const rent = {
    type: "income",
    source: "rental",
    category: "rental_income",
    name: "Flat rent",
    amount: 1200,
    date: "2026-05-01",
  };
  const interest = {
    type: "income",
    source: "savings",
    category: "savings_interest",
    name: "Interest",
    amount: 120,
    date: "2026-05-01",
  };

  const refusal = async (promise: Promise<unknown>) => {
    const error = await promise.then(
      () => null,
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(BadRequestException);
    expect((error as BadRequestException).getResponse()).toEqual({
      code: "validation_failed",
      message: "Request failed validation",
      issues: [
        {
          path: "body.accountId",
          code: "custom",
          message: "Choose one of your accounts that fits this income source",
        },
      ],
    });
  };

  it("links a rental record to the user's rental Property or a Mortgage", async () => {
    const { service } = setup();
    const onProperty = await service.createRecord("u1", { ...rent, accountId: RENTAL } as never);
    expect(onProperty.accountId).toBe(RENTAL);
    const onMortgage = await service.createRecord("u1", {
      ...rent,
      type: "expense",
      category: "mortgage_interest",
      accountId: BTL,
    } as never);
    expect(onMortgage.accountId).toBe(BTL);
  });

  it("links a savings record to a savings or investment account, ISA included", async () => {
    const { service } = setup();
    expect(
      (await service.createRecord("u1", { ...interest, accountId: SAVER } as never)).accountId,
    ).toBe(SAVER);
    expect(
      (await service.createRecord("u1", { ...interest, accountId: ISA } as never)).accountId,
    ).toBe(ISA);
  });

  it("returns accountId null when no account is given", async () => {
    const { service } = setup();
    expect((await service.createRecord("u1", rent as never)).accountId).toBeNull();
  });

  it("refuses another user's account and a missing id with the same 400", async () => {
    const { service, records } = setup();
    await refusal(service.createRecord("u1", { ...rent, accountId: THEIRS } as never));
    await refusal(service.createRecord("u1", { ...rent, accountId: MISSING } as never));
    await refusal(service.createRecord("u1", { ...rent, accountId: "not-a-uuid" } as never));
    expect(records.rows).toHaveLength(0);
  });

  it("refuses an account whose type does not fit the source", async () => {
    const { service } = setup();
    await refusal(service.createRecord("u1", { ...rent, accountId: HOME } as never));
    await refusal(service.createRecord("u1", { ...rent, accountId: SAVER } as never));
    await refusal(service.createRecord("u1", { ...interest, accountId: RENTAL } as never));
    await refusal(service.createRecord("u1", { ...interest, accountId: CURRENT } as never));
  });

  it("refuses any account on a PAYE or self-employed record", async () => {
    const { service } = setup();
    await refusal(
      service.createRecord("u1", { ...base, date: "2026-05-01", accountId: SAVER } as never),
    );
    await refusal(
      service.createRecord("u1", {
        type: "income",
        source: "self-employed",
        category: "self_employed_income",
        name: "Invoices",
        amount: 500,
        date: "2026-05-01",
        accountId: RENTAL,
      } as never),
    );
  });

  it("checks every record of a bulk create before opening the transaction", async () => {
    const records = createInMemoryRepository();
    const transaction = vi.fn();
    Object.assign(records, { manager: { transaction } });
    const service = new TaxService(records as never, accounts() as never);
    await refusal(
      service.createBulk("u1", {
        records: [
          { ...rent, accountId: RENTAL },
          { ...rent, accountId: THEIRS },
        ],
      } as never),
    );
    expect(transaction).not.toHaveBeenCalled();
  });

  it("clears the link with null on update", async () => {
    const { service } = setup();
    const created = await service.createRecord("u1", { ...rent, accountId: RENTAL } as never);
    const updated = await service.updateRecord(
      "u1",
      created.id,
      { accountId: null } as never,
      undefined,
    );
    expect(updated.accountId).toBeNull();
  });

  it("links and refuses on update, checking the merged record", async () => {
    const { service } = setup();
    const created = await service.createRecord("u1", rent as never);
    const linked = await service.updateRecord(
      "u1",
      created.id,
      { accountId: BTL } as never,
      undefined,
    );
    expect(linked.accountId).toBe(BTL);
    await refusal(
      service.updateRecord("u1", created.id, { accountId: THEIRS } as never, undefined),
    );
    // Moving a linked rental record to self-employed would leave it pointing at a mortgage.
    await refusal(
      service.updateRecord(
        "u1",
        created.id,
        { source: "self-employed", category: "self_employed_income" } as never,
        undefined,
      ),
    );
    // With the link cleared in the same request, the move is fine.
    const moved = await service.updateRecord(
      "u1",
      created.id,
      { source: "self-employed", category: "self_employed_income", accountId: null } as never,
      undefined,
    );
    expect(moved).toMatchObject({ source: "self-employed", accountId: null });
  });
});

describe("TaxService when the linked account goes between the check and the save", () => {
  it("answers with the same 400 as any other refused link, not a 500", async () => {
    const ACCOUNT = "00000000-0000-4000-8000-0000000000c1";
    const records = createInMemoryRepository();
    // The account is deleted after the check: the database's composite foreign key refuses.
    const fkError = Object.assign(new Error("insert or update violates foreign key"), {
      code: "23503",
      constraint: "FK_tax_records_account",
    });
    vi.spyOn(records, "save").mockRejectedValue(fkError as never);
    const accounts = createInMemoryRepository([
      { id: ACCOUNT, userId: "u1", type: "Property", accountSubtype: "rental" },
    ]);
    const service = new TaxService(records as never, accounts as never);
    const error = await service
      .createRecord("u1", {
        type: "income",
        source: "rental",
        category: "rental_income",
        name: "Rent",
        amount: 1000,
        date: "2026-06-01",
        accountId: ACCOUNT,
      } as never)
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(BadRequestException);
    expect((error as BadRequestException).getResponse()).toMatchObject({
      issues: [{ path: "body.accountId" }],
    });
  });
});

describe("TaxService input checks before anything is written", () => {
  const CAP_ID = "00000000-0000-4000-8000-000000000001";
  const service = (outside = createInMemoryRepository()) =>
    new TaxService(outside as never, createInMemoryRepository() as never);

  it("refuses a date with anything before or after YYYY-MM-DD", async () => {
    // Postgres would 500 on these; the service answers 400 first.
    for (const date of ["2026-05-01junk", "x2026-05-01", "2026-05-01T00:00:00Z"]) {
      await expect(
        service().createRecord("u1", { ...base, frequency: "monthly", date } as never),
      ).rejects.toBeInstanceOf(BadRequestException);
    }
  });

  it("refuses a cap id with anything before or after the uuid", async () => {
    const { outside, transaction } = withManager();
    for (const id of [`${CAP_ID}x`, `x${CAP_ID}`]) {
      await expect(
        service(outside).createBulk("u1", {
          records: [],
          capPreviousRecordIds: [{ id, endDate: "2026-04-05" }],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    }
    expect(transaction).not.toHaveBeenCalled();
  });

  it("refuses a cap end date that is not a real calendar date", async () => {
    const { outside, transaction } = withManager();
    await expect(
      service(outside).createBulk("u1", {
        records: [],
        capPreviousRecordIds: [{ id: CAP_ID, endDate: "2026-02-30" }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(transaction).not.toHaveBeenCalled();
  });

  it("refuses more caps than the bulk limit, each one valid on its own", async () => {
    const { outside, transaction } = withManager();
    // One over the limit; the ids are distinct valid uuids, so only the count can refuse them.
    const caps = Array.from({ length: MAX_BULK_TAX_RECORDS + 1 }, (_, i) => ({
      id: `00000000-0000-4000-8000-${i.toString(16).padStart(12, "0")}`,
      endDate: "2026-04-05",
    }));
    await expect(
      service(outside).createBulk("u1", { records: [], capPreviousRecordIds: caps }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(transaction).not.toHaveBeenCalled();
  });

  it("writes nothing for a bulk body with neither records nor caps", async () => {
    const { outside, transaction } = withManager();
    await expect(service(outside).createBulk("u1", {} as never)).resolves.toEqual([]);
    expect(transaction).not.toHaveBeenCalled();
  });

  it("refuses an account id that is not a uuid without looking it up", async () => {
    const accounts = createInMemoryRepository();
    const tax = new TaxService(createInMemoryRepository() as never, accounts as never);
    await expect(
      tax.createRecord("u1", {
        type: "income",
        source: "savings",
        category: "savings_interest",
        name: "Interest",
        amount: 120,
        date: "2026-05-01",
        accountId: "not-a-uuid",
      } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(accounts.findOne).not.toHaveBeenCalled();
  });
});

describe("TaxService stores receipts encrypted on every write path (SEC-D)", () => {
  // A minimal PDF: the magic bytes are all the sniffer checks.
  const pdfDataUrl = `data:application/pdf;base64,${Buffer.from("%PDF-1.4\n").toString("base64")}`;
  const withReceipt = {
    ...base,
    frequency: "monthly",
    date: "2026-05-01",
    receiptFilename: "receipt.pdf",
    receiptData: pdfDataUrl,
  };

  it("encrypts a bulk record's receipt under the id the row is saved with", async () => {
    const { outside, inside } = withManager();
    const service = new TaxService(outside as never, createInMemoryRepository() as never);

    const [created] = await service.createBulk("u1", { records: [withReceipt as never] });

    const row = inside.rows[0] as { id: string; receiptData: string };
    expect(isEncryptedToken(row.receiptData)).toBe(true);
    // The key is bound to the record id, so it must decrypt with the id the row carries.
    expect(decryptReceiptData(row.receiptData, row.id)).toBe(pdfDataUrl);
    expect(created).toMatchObject({ id: row.id, hasReceipt: true });
    expect(created).not.toHaveProperty("receiptData");
  });

  it("encrypts a receipt added by an update under the record's id", async () => {
    const records = createInMemoryRepository([{ ...base, id: "rec-1", userId: "u1" }]);
    const service = new TaxService(records as never, createInMemoryRepository() as never);

    await service.updateRecord(
      "u1",
      "rec-1",
      { receiptFilename: "receipt.pdf", receiptData: pdfDataUrl } as never,
      undefined,
    );

    const row = records.rows[0] as { receiptData: string };
    expect(isEncryptedToken(row.receiptData)).toBe(true);
    expect(decryptReceiptData(row.receiptData, "rec-1")).toBe(pdfDataUrl);
  });
});

describe("TaxService legacy receipt write-back is scoped to the caller's row", () => {
  it("rewrites only the row with that id, owned by that user, still holding that plaintext", async () => {
    const RECORD_ID = "00000000-0000-4000-8000-0000000000aa";
    const pdfDataUrl = `data:application/pdf;base64,${Buffer.from("%PDF-1.4\n").toString("base64")}`;
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
        receiptData: pdfDataUrl,
      }),
      createQueryBuilder: vi.fn().mockReturnValue(qb),
    };
    const service = new TaxService(repo as never, createInMemoryRepository() as never);

    await service.readReceipt("u1", RECORD_ID);

    // The owner filter is the tenancy contract: the update names the user column and binds it.
    const [clause, params] = qb.where.mock.calls[0] ?? [];
    expect(clause).toContain('"id" = :id');
    expect(clause).toContain('"user_id" = :userId');
    expect(clause).toContain('"receipt_data" = :plaintext');
    expect(params).toMatchObject({ id: RECORD_ID, userId: "u1" });
  });
});

describe("TaxService errors from a failed save", () => {
  const ACCOUNT = "00000000-0000-4000-8000-0000000000c1";
  const rentalAccount = () =>
    createInMemoryRepository([
      { id: ACCOUNT, userId: "u1", type: "Property", accountSubtype: "rental" },
    ]);
  const rent = {
    type: "income",
    source: "rental",
    category: "rental_income",
    name: "Rent",
    amount: 1000,
    date: "2026-06-01",
  };

  const failedCreate = async (err: unknown) => {
    const records = createInMemoryRepository();
    vi.spyOn(records, "save").mockRejectedValue(err as never);
    const service = new TaxService(records as never, rentalAccount() as never);
    return service.createRecord("u1", rent as never).catch((e: unknown) => e);
  };

  it("returns an error that is not the account foreign key unchanged", async () => {
    const plain = new Error("connection lost");
    expect(await failedCreate(plain)).toBe(plain);
    // The right code on another constraint is some other foreign key, not the account link.
    const otherKey = Object.assign(new Error("fk"), {
      driverError: { code: "23503", constraint: "FK_something_else" },
    });
    expect(await failedCreate(otherKey)).toBe(otherKey);
    // The account link's name under another code is not a foreign key failure.
    const notNull = Object.assign(new Error("not null"), {
      driverError: { code: "23502", constraint: "FK_tax_records_account" },
    });
    expect(await failedCreate(notNull)).toBe(notNull);
  });

  it("answers an update that loses its account before the save with the link 400", async () => {
    const records = createInMemoryRepository([{ ...rent, id: "rec-1", userId: "u1" }]);
    vi.spyOn(records, "save").mockRejectedValue(
      Object.assign(new Error("fk"), {
        code: "23503",
        constraint: "FK_tax_records_account",
      }) as never,
    );
    const service = new TaxService(records as never, rentalAccount() as never);
    const error = await service
      .updateRecord("u1", "rec-1", { accountId: ACCOUNT } as never, undefined)
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(BadRequestException);
    expect((error as BadRequestException).getResponse()).toMatchObject({
      issues: [{ path: "body.accountId" }],
    });
  });
});
