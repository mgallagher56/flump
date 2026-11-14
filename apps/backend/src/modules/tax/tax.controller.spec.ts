import {
  BulkCreateTaxRecordsRequest,
  MAX_BULK_TAX_RECORDS as CONTRACT_MAX_BULK_TAX_RECORDS,
  type TaxRecordCap,
  TaxRecordDto,
} from "@flump/api-contract";
import {
  BadRequestException,
  NotFoundException,
  ParseUUIDPipe,
  StreamableFile,
} from "@nestjs/common";
import { describe, expect, expectTypeOf, it, vi } from "vitest";
import { createInMemoryRepository } from "../../testing/in-memory-repository";
import { at } from "../../testing/must";
import { withManager } from "../../testing/with-manager";
import { MAX_BULK_TAX_RECORDS, TaxController } from "./tax.controller";
import { TaxService } from "./tax.service";

/** Test wiring (BE-13): the controller takes TaxService; the profile repository is no longer used. */
const taxController = (taxRepo: unknown, _profileRepo?: unknown) =>
  new TaxController(new TaxService(taxRepo as never));

describe("TaxController", () => {
  it("should be defined", () => {
    expect(TaxController).toBeDefined();
  });

  it("should bulk create records and cap previous records", async () => {
    const mockRepo = {
      update: vi.fn().mockResolvedValue({ affected: 1 }),
      create: vi.fn().mockImplementation((records) => records),
      save: vi.fn().mockImplementation((records) => Promise.resolve(records)),
      find: vi.fn(),
      findOne: vi.fn(),
      remove: vi.fn(),
    };

    const mockProfileRepo = {
      findOne: vi.fn().mockResolvedValue(null),
    };

    const controller = taxController(withManager(mockRepo), mockProfileRepo);
    const mockReq = { user: { id: "user-123" } };

    const bulkPayload = {
      records: [
        {
          name: "Rental income (2025/26)",
          source: "rental" as const,
          type: "income" as const,
          category: "rental_income",
          amount: 1200,
          frequency: "monthly" as const,
          date: "2025-04-01",
        },
      ],
      capPreviousRecordIds: [{ id: "00000000-0000-4000-8000-0000000000a1", endDate: "2025-03-31" }],
    };

    const result = await controller.createBulkTaxRecords(mockReq, bulkPayload);

    expect(mockRepo.update).toHaveBeenCalledWith(
      { id: "00000000-0000-4000-8000-0000000000a1", userId: "user-123" },
      { endDate: "2025-03-31" },
    );
    expect(result).toHaveLength(1);

    // Empty records returns []
    expect(await controller.createBulkTaxRecords(mockReq, { records: [] })).toEqual([]);
  });

  it("returns [] for a new user and never calls create or save", async () => {
    const mockRepo = createInMemoryRepository([
      { id: "other", userId: "user-999", date: "2026-01-01" },
    ]);
    const mockProfileRepo = {
      findOne: vi.fn().mockResolvedValue(null),
    };

    const controller = taxController(withManager(mockRepo), mockProfileRepo);
    const result = await controller.getTaxRecords({ user: { id: "user-123" } });

    expect(result).toEqual([]);
    expect(mockRepo.create).not.toHaveBeenCalled();
    expect(mockRepo.save).not.toHaveBeenCalled();
  });

  it("handles single record get, create, update, and delete", async () => {
    const mockRepo = {
      findOne: vi.fn(),
      create: vi.fn((r) => ({ id: "r-new", ...r })),
      save: vi.fn((r) => Promise.resolve(r)),
      remove: vi.fn().mockResolvedValue(undefined),
    };
    const controller = taxController(withManager(mockRepo), {});
    const req = { user: { id: "u1" } };

    // Get single
    mockRepo.findOne.mockResolvedValueOnce(null);
    await expect(controller.getTaxRecord(req, "missing")).rejects.toThrow(NotFoundException);
    mockRepo.findOne.mockResolvedValueOnce({ id: "r1" });
    expect(await controller.getTaxRecord(req, "r1")).toEqual({
      id: "r1",
      endDate: null,
      notes: null,
      receiptFilename: null,
      receiptMimeType: null,
      hasReceipt: false,
    });

    // Create
    const created = await controller.createTaxRecord(req, { name: "Div", amount: 100 } as never);
    expect(created.name).toBe("Div");

    // Update
    mockRepo.findOne.mockResolvedValueOnce(null);
    await expect(controller.updateTaxRecord(req, "missing", { amount: 200 })).rejects.toThrow(
      NotFoundException,
    );
    mockRepo.findOne.mockResolvedValueOnce({ id: "r1", amount: 100 });
    const updated = await controller.updateTaxRecord(req, "r1", { amount: 200 });
    expect(updated.amount).toBe(200);

    // Delete
    mockRepo.findOne.mockResolvedValueOnce(null);
    await expect(controller.deleteTaxRecord(req, "missing")).rejects.toThrow(NotFoundException);
    mockRepo.findOne.mockResolvedValueOnce({ id: "r1" });
    expect(await controller.deleteTaxRecord(req, "r1")).toEqual({ success: true });
  });

  it("scopes tax records by owner: user B cannot get, update, delete or cap user A's record", async () => {
    const RA = "00000000-0000-4000-8000-0000000000a2";
    const original = { id: RA, userId: "userA", name: "Rent", amount: 100, endDate: null };
    const taxRepo = createInMemoryRepository([original]);
    const profileRepo = createInMemoryRepository([
      { userId: "userB", hasResetFinancialData: true },
    ]);
    const controller = taxController(withManager(taxRepo), profileRepo);
    const userA = { user: { id: "userA" } };
    const userB = { user: { id: "userB" } };

    await expect(controller.getTaxRecord(userB, RA)).rejects.toThrow(NotFoundException);
    await expect(controller.updateTaxRecord(userB, RA, { amount: 1 })).rejects.toThrow(
      NotFoundException,
    );
    await expect(controller.deleteTaxRecord(userB, RA)).rejects.toThrow(NotFoundException);
    await controller.createBulkTaxRecords(userB, {
      records: [],
      capPreviousRecordIds: [{ id: RA, endDate: "2020-01-01" }],
    });

    expect(taxRepo.rows).toEqual([original]);
    expect(await controller.getTaxRecords(userB)).toEqual([]);
    expect((await controller.getTaxRecord(userA, RA)).name).toBe("Rent");
  });

  describe("tax record writes ignore client-supplied ids and ownership", () => {
    const setup = () => {
      const victim = { id: "r-A", userId: "userA", name: "Rent", amount: 100, endDate: null };
      const own = { id: "r-B", userId: "userB", name: "Mine", amount: 5, endDate: null };
      const taxRepo = createInMemoryRepository([victim, own]);
      const controller = taxController(withManager(taxRepo), {});
      return { victim, own, taxRepo, controller, userB: { user: { id: "userB" } } };
    };

    it("createTaxRecord: B posting A's id leaves A's row unchanged and gets a fresh row", async () => {
      const { victim, taxRepo, controller, userB } = setup();

      const created = await controller.createTaxRecord(userB, {
        id: "r-A",
        userId: "userA",
        name: "Takeover",
        amount: 1,
      } as never);

      expect(taxRepo.rows.find((r) => r.id === "r-A")).toEqual(victim);
      expect(created.id).not.toBe("r-A");
      expect(created.userId).toBe("userB");
      expect(created.name).toBe("Takeover");
    });

    it("createBulkTaxRecords: B bulk-posting A's id leaves A's row unchanged and gets a fresh row", async () => {
      const { victim, taxRepo, controller, userB } = setup();

      const created = await controller.createBulkTaxRecords(userB, {
        records: [{ id: "r-A", userId: "userA", name: "Takeover", amount: 1 } as never],
      });

      expect(taxRepo.rows.find((r) => r.id === "r-A")).toEqual(victim);
      expect(at(created, 0).id).not.toBe("r-A");
      expect(at(created, 0).userId).toBe("userB");
      expect(at(created, 0).name).toBe("Takeover");
    });

    it("updateTaxRecord: PATCH with another id leaves both rows and ids unchanged but applies allowed fields", async () => {
      const { victim, taxRepo, controller, userB } = setup();

      const updated = await controller.updateTaxRecord(userB, "r-B", {
        id: "r-A",
        amount: 99,
      } as never);

      expect(updated.id).toBe("r-B");
      expect(taxRepo.rows.find((r) => r.id === "r-A")).toEqual(victim);
      expect(taxRepo.rows.find((r) => r.id === "r-B")).toMatchObject({
        userId: "userB",
        amount: 99,
      });
      expect(taxRepo.rows).toHaveLength(2);
    });

    it("updateTaxRecord: PATCH with another userId does not change userId", async () => {
      const { taxRepo, controller, userB } = setup();

      await controller.updateTaxRecord(userB, "r-B", { userId: "other", name: "Renamed" } as never);

      expect(taxRepo.rows.find((r) => r.id === "r-B")).toMatchObject({
        userId: "userB",
        name: "Renamed",
      });
    });
  });
});

describe("TaxController annual record end date (E23 D16)", () => {
  const req = { user: { id: "u1" } };
  const setup = () => {
    const repo = createInMemoryRepository();
    return taxController(withManager(repo), { findOne: vi.fn() });
  };
  const base = {
    type: "income",
    source: "paye",
    category: "salary",
    name: "Pay",
    amount: 1000,
  } as const;

  it("fills end_date with 5 April closing the tax year containing the date", async () => {
    const controller = setup();
    const a = await controller.createTaxRecord(req, {
      ...base,
      frequency: "annual",
      date: "2024-06-01",
    });
    expect(a.endDate).toBe("2025-04-05");
    const b = await controller.createTaxRecord(req, {
      ...base,
      frequency: "annual",
      date: "2025-02-10",
    });
    expect(b.endDate).toBe("2025-04-05");
    const c = await controller.createTaxRecord(req, {
      ...base,
      frequency: "annual",
      date: "2025-04-05",
    });
    // 5 April is the last day of the tax year (audit M1: it used to file under the next year).
    expect(c.endDate).toBe("2025-04-05");
  });

  it("files a record dated 1-5 April under the tax year ending that 5 April (audit M1)", async () => {
    const controller = setup();
    const cases: Array<[string, string]> = [
      ["2026-04-01", "2026-04-05"],
      ["2026-04-03", "2026-04-05"], // in 2025/26
      ["2026-04-05", "2026-04-05"],
      ["2026-04-06", "2027-04-05"], // first day of 2026/27
      ["2026-03-31", "2026-04-05"],
    ];
    for (const [date, endDate] of cases) {
      const r = await controller.createTaxRecord(req, { ...base, frequency: "annual", date });
      expect(r.endDate, date).toBe(endDate);
    }
    const [bulk] = await controller.createBulkTaxRecords(req, {
      records: [{ ...base, frequency: "annual", date: "2026-04-03" } as never],
    });
    expect(bulk?.endDate).toBe("2026-04-05");
  });

  it("derives an annual end date even when the client sends one, and leaves other frequencies alone", async () => {
    const controller = setup();
    const explicit = await controller.createTaxRecord(req, {
      ...base,
      frequency: "annual",
      date: "2024-06-01",
      endDate: "2030-04-05",
    });
    expect(explicit.endDate).toBe("2025-04-05");
    const monthly = await controller.createTaxRecord(req, {
      ...base,
      frequency: "monthly",
      date: "2024-06-01",
    });
    expect(monthly.endDate ?? null).toBeNull();
  });

  it("recomputes the annual end date when PATCH moves the date (no stale end date)", async () => {
    const controller = setup();
    const created = await controller.createTaxRecord(req, {
      ...base,
      frequency: "annual",
      date: "2024-06-01",
    });
    expect(created.endDate).toBe("2025-04-05");
    const moved = await controller.updateTaxRecord(req, created.id, { date: "2025-06-01" });
    expect(moved.endDate).toBe("2026-04-05");
  });

  it("rejects a malformed or impossible date with 400 instead of a database 500", async () => {
    const controller = setup();
    for (const date of ["2024-13-45", "2024-06-xx", "2024-02-30", "not a date"]) {
      await expect(
        controller.createTaxRecord(req, { ...base, frequency: "annual", date }),
      ).rejects.toThrow(BadRequestException);
    }
    await expect(
      controller.createTaxRecord(req, {
        ...base,
        frequency: "monthly",
        date: "2024-06-01",
        endDate: "2024-02-31",
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it("fills end_date on bulk create", async () => {
    const controller = setup();
    const [r] = await controller.createBulkTaxRecords(req, {
      records: [{ ...base, frequency: "annual", date: "2023-09-01" } as never],
    });
    expect(r?.endDate).toBe("2024-04-05");
  });
});

describe("TaxController receipt validation (E20-N14)", () => {
  const makeController = () => {
    const repo = {
      create: vi.fn((r) => r),
      save: vi.fn((r) => Promise.resolve(r)),
      findOne: vi.fn().mockResolvedValue({ id: "r1", userId: "u1" }),
      update: vi.fn(),
    };
    return { repo, controller: taxController(withManager(repo), {}) };
  };
  const req = { user: { id: "u1" } };
  const base = {
    name: "x",
    amount: 1,
    date: "2025-04-01",
    type: "income" as const,
    source: "paye" as const,
    category: "c",
  };
  const html = `data:text/html;base64,${Buffer.from("<script>").toString("base64")}`;

  it("rejects a bad receipt on create, patch and bulk with 400", async () => {
    const { controller, repo } = makeController();
    await expect(controller.createTaxRecord(req, { ...base, receiptData: html })).rejects.toThrow(
      BadRequestException,
    );
    await expect(controller.updateTaxRecord(req, "r1", { receiptData: html })).rejects.toThrow(
      BadRequestException,
    );
    await expect(
      controller.createBulkTaxRecords(req, { records: [{ ...base, receiptFilename: "../x.pdf" }] }),
    ).rejects.toThrow(BadRequestException);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it("rejects a bulk batch over the record cap with 400 before touching the database", async () => {
    const { controller, repo } = makeController();
    const records = Array.from({ length: MAX_BULK_TAX_RECORDS + 1 }, () => ({ ...base }));
    await expect(controller.createBulkTaxRecords(req, { records })).rejects.toThrow(
      BadRequestException,
    );
    await expect(controller.createBulkTaxRecords(req, { records })).rejects.toThrow(
      `at most ${MAX_BULK_TAX_RECORDS}`,
    );
    expect(repo.save).not.toHaveBeenCalled();
    expect(repo.create).not.toHaveBeenCalled();
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("rejects an oversized capPreviousRecordIds with 400 and writes nothing", async () => {
    const { controller, repo } = makeController();
    const capPreviousRecordIds = Array.from({ length: MAX_BULK_TAX_RECORDS + 1 }, (_, i) => ({
      id: `id${i}`,
      endDate: "2025-03-31",
    }));
    await expect(
      controller.createBulkTaxRecords(req, { records: [{ ...base }], capPreviousRecordIds }),
    ).rejects.toThrow(BadRequestException);
    expect(repo.update).not.toHaveBeenCalled();
    expect(repo.create).not.toHaveBeenCalled();
    expect(repo.save).not.toHaveBeenCalled();
  });

  it("applies no caps when a record in the same batch is invalid", async () => {
    const { controller, repo } = makeController();
    await expect(
      controller.createBulkTaxRecords(req, {
        records: [{ ...base, receiptFilename: "../x.pdf" }],
        capPreviousRecordIds: [{ id: "old", endDate: "2025-03-31" }],
      }),
    ).rejects.toThrow(BadRequestException);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it.each([[null], [{}], [{ id: "old" }], ["x"]])(
    "rejects a malformed capPreviousRecordIds item %j with 400",
    async (item) => {
      const { controller, repo } = makeController();
      await expect(
        controller.createBulkTaxRecords(req, {
          records: [{ ...base }],
          capPreviousRecordIds: [item as never],
        }),
      ).rejects.toThrow(BadRequestException);
      expect(repo.update).not.toHaveBeenCalled();
      expect(repo.save).not.toHaveBeenCalled();
    },
  );

  it("uses the contract's bulk cap, so the handler rejects what the contract rejects", () => {
    expect(MAX_BULK_TAX_RECORDS).toBe(CONTRACT_MAX_BULK_TAX_RECORDS);
    const records = Array.from({ length: MAX_BULK_TAX_RECORDS + 1 }, () => ({ ...base }));
    expect(BulkCreateTaxRecordsRequest.safeParse({ records }).success).toBe(false);
  });

  it("types capPreviousRecordIds as the contract's { id, endDate }[]", () => {
    type BulkBody = Parameters<TaxController["createBulkTaxRecords"]>[1];
    expectTypeOf<NonNullable<BulkBody["capPreviousRecordIds"]>>().toEqualTypeOf<TaxRecordCap[]>();
    expectTypeOf<TaxRecordCap>().toEqualTypeOf<{ id: string; endDate: string }>();
  });

  it("rejects a capPreviousRecordIds endDate that is not a calendar date, writing nothing", async () => {
    const { controller, repo } = makeController();
    await expect(
      controller.createBulkTaxRecords(req, {
        records: [{ ...base }],
        capPreviousRecordIds: [{ id: "old", endDate: "2025-02-30" }],
      }),
    ).rejects.toThrow(BadRequestException);
    expect(repo.update).not.toHaveBeenCalled();
    expect(repo.save).not.toHaveBeenCalled();
  });

  it("accepts a bulk batch exactly at the record cap", async () => {
    const { controller, repo } = makeController();
    const records = Array.from({ length: MAX_BULK_TAX_RECORDS }, () => ({ ...base }));
    await controller.createBulkTaxRecords(req, { records });
    expect(repo.save).toHaveBeenCalledTimes(1);
  });

  it("accepts a valid PDF receipt", async () => {
    const { controller } = makeController();
    const pdf = `data:application/pdf;base64,${Buffer.from("%PDF-1.4 body").toString("base64")}`;
    await expect(
      controller.createTaxRecord(req, {
        ...base,
        receiptFilename: "a.pdf",
        receiptMimeType: "application/pdf",
        receiptData: pdf,
      }),
    ).resolves.toBeDefined();
  });

  it("normalises the MIME type and nulls receipt fields when data is cleared", async () => {
    const { controller, repo } = makeController();
    const pdf = `data:APPLICATION/PDF;base64,${Buffer.from("%PDF-1.4 body").toString("base64")}`;
    await controller.createTaxRecord(req, { ...base, receiptData: pdf });
    expect(repo.create).toHaveBeenLastCalledWith(
      expect.objectContaining({ receiptMimeType: "application/pdf" }),
    );
    await controller.createTaxRecord(req, {
      ...base,
      receiptData: null,
      receiptMimeType: "application/pdf",
      receiptFilename: "a.pdf",
    });
    expect(repo.create).toHaveBeenLastCalledWith(
      expect.objectContaining({ receiptData: null, receiptMimeType: null, receiptFilename: null }),
    );
  });

  describe("receipts (E20-N15)", () => {
    const PNG_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
    const PNG_URL = `data:image/png;base64,${PNG_BYTES.toString("base64")}`;
    const withReceipt = {
      id: "r-A",
      userId: "userA",
      name: "Rent",
      amount: 100,
      receiptFilename: "rent.png",
      receiptMimeType: "image/png",
      receiptData: PNG_URL,
    };
    const userA = { user: { id: "userA" } };
    const userB = { user: { id: "userB" } };
    const read = async (file: StreamableFile): Promise<Buffer> => {
      const chunks: Buffer[] = [];
      for await (const chunk of file.getStream()) chunks.push(Buffer.from(chunk));
      return Buffer.concat(chunks);
    };

    it("lists and details never expose receiptData but flag hasReceipt", async () => {
      const repo = createInMemoryRepository([
        withReceipt,
        { id: "r-N", userId: "userA", name: "None", receiptFilename: null, receiptData: null },
      ]);
      const controller = taxController(withManager(repo), {});

      const list = await controller.getTaxRecords(userA);
      expect(list.map((r) => r.hasReceipt).sort()).toEqual([false, true]);
      for (const r of list) expect(r).not.toHaveProperty("receiptData");

      const detail = await controller.getTaxRecord(userA, "r-A");
      expect(detail.hasReceipt).toBe(true);
      expect(detail).not.toHaveProperty("receiptData");
    });

    it("create and patch responses omit receiptData and report hasReceipt", async () => {
      const repo = createInMemoryRepository([]);
      const controller = taxController(withManager(repo), {});
      const created = await controller.createTaxRecord(userA, {
        name: "x",
        receiptFilename: "a.png",
        receiptData: PNG_URL,
      } as never);
      expect(created.hasReceipt).toBe(true);
      expect(created).not.toHaveProperty("receiptData");

      const patched = await controller.updateTaxRecord(userA, created.id, { amount: 5 });
      expect(patched.hasReceipt).toBe(true);
      expect(patched).not.toHaveProperty("receiptData");
      expect(at(repo.rows, 0).receiptData).toBe(PNG_URL);

      const cleared = await controller.updateTaxRecord(userA, created.id, { receiptData: null });
      expect(cleared.hasReceipt).toBe(false);
      expect(at(repo.rows, 0).receiptData).toBeNull();
    });

    it("PATCH ignores a client-sent filename or MIME type without receiptData", async () => {
      const repo = createInMemoryRepository([withReceipt]);
      const controller = taxController(withManager(repo), {});
      await controller.updateTaxRecord(userA, "r-A", {
        receiptFilename: "evil.pdf",
        receiptMimeType: "application/pdf",
      });
      expect(repo.rows[0]).toMatchObject({
        receiptFilename: "rent.png",
        receiptMimeType: "image/png",
      });
    });

    it("route ids are validated as UUIDs and the receipt route sets the CSP", () => {
      const params = Reflect.getMetadata(
        "__routeArguments__",
        TaxController,
        "getReceipt",
      ) as Record<string, { data: string; pipes: unknown[] }>;
      const idArg = Object.values(params).find((a) => a.data === "id");
      expect(idArg?.pipes.some((p) => p instanceof ParseUUIDPipe)).toBe(true);
      const headers = Reflect.getMetadata("__headers__", TaxController.prototype.getReceipt) as {
        name: string;
        value: string;
      }[];
      expect(headers).toContainEqual({
        name: "Content-Security-Policy",
        value: "sandbox; default-src 'none'",
      });
    });

    it("PATCH keeps the stored receipt when the body omits it", async () => {
      const repo = createInMemoryRepository([withReceipt]);
      const controller = taxController(withManager(repo), {});
      await controller.updateTaxRecord(userA, "r-A", { name: "Renamed" });
      expect(repo.rows[0]).toMatchObject({ name: "Renamed", receiptData: PNG_URL });
    });

    it("GET receipt returns the bytes with the sniffed type to the owner", async () => {
      const controller = taxController(createInMemoryRepository([withReceipt]), {});
      const file = await controller.getReceipt(userA, "r-A");
      expect(file.getHeaders().type).toBe("image/png");
      expect(await read(file)).toEqual(PNG_BYTES);
      expect(file.getHeaders().disposition).toBe("attachment; filename*=UTF-8''rent.png");
    });

    it("GET receipt asks the repository explicitly for the select:false column", async () => {
      const repo = createInMemoryRepository([withReceipt]);
      const controller = taxController(withManager(repo), {});
      await controller.getReceipt(userA, "r-A");
      const options = at(repo.findOne.mock.calls, 0)[0] as {
        where: unknown;
        select: { receiptData?: boolean };
      };
      expect(options.where).toEqual({ id: "r-A", userId: "userA" });
      expect(options.select.receiptData).toBe(true);
    });

    it("GET receipt is 404 for another user, a missing id, no receipt and legacy bad data", async () => {
      const repo = createInMemoryRepository([
        withReceipt,
        { id: "r-N", userId: "userA", receiptData: null },
        {
          id: "r-L",
          userId: "userA",
          receiptFilename: "x.html",
          receiptMimeType: "text/html",
          receiptData: "data:text/html;base64,PGI+aGk8L2I+",
        },
      ]);
      const controller = taxController(withManager(repo), {});
      await expect(controller.getReceipt(userB, "r-A")).rejects.toThrow(NotFoundException);
      await expect(controller.getReceipt(userA, "nope")).rejects.toThrow(NotFoundException);
      await expect(controller.getReceipt(userA, "r-N")).rejects.toThrow(NotFoundException);
      await expect(controller.getReceipt(userA, "r-L")).rejects.toThrow(NotFoundException);
    });
  });
});

describe("TaxController response shape (E21)", () => {
  const req = { user: { id: "00000000-0000-4000-8000-000000000001" } };
  const base = {
    name: "Salary",
    amount: 1234.5,
    date: "2025-04-06",
    type: "income" as const,
    source: "paye" as const,
    category: "salary",
  };
  /** Mimics an insert: generated columns filled, unset nullable columns left undefined. */
  const saveLikeInsert = (r: Record<string, unknown>) => ({
    ...r,
    id: "00000000-0000-4000-8000-0000000000aa",
    frequency: r.frequency ?? "one-off",
    createdAt: new Date("2025-04-06T10:00:00Z"),
    updatedAt: new Date("2025-04-06T10:00:00Z"),
  });

  it("returns every nullable key as null on create and bulk, matching TaxRecordDto", async () => {
    const repo = {
      create: vi.fn((r) => r),
      save: vi.fn((r) =>
        Promise.resolve(Array.isArray(r) ? r.map(saveLikeInsert) : saveLikeInsert(r)),
      ),
      update: vi.fn(),
    };
    const controller = taxController(withManager(repo), {});
    const created = await controller.createTaxRecord(req, { ...base });
    const [bulk] = await controller.createBulkTaxRecords(req, { records: [{ ...base }] });
    for (const record of [created, bulk]) {
      expect(record).toMatchObject({
        endDate: null,
        notes: null,
        receiptFilename: null,
        receiptMimeType: null,
        hasReceipt: false,
      });
      expect(record).not.toHaveProperty("receiptData");
      expect(TaxRecordDto.safeParse(JSON.parse(JSON.stringify(record))).success).toBe(true);
    }
  });
});
