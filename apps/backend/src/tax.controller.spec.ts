import { BadRequestException, NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { TaxController } from "./tax.controller";
import { createInMemoryRepository } from "./testing/in-memory-repository";

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

    const controller = new TaxController(mockRepo as any, mockProfileRepo as any);
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
      capPreviousRecordIds: [{ id: "old-rec-1", endDate: "2025-03-31" }],
    };

    const result = await controller.createBulkTaxRecords(mockReq, bulkPayload);

    expect(mockRepo.update).toHaveBeenCalledWith(
      { id: "old-rec-1", userId: "user-123" },
      { endDate: "2025-03-31" },
    );
    expect(result).toHaveLength(1);

    // Empty records returns []
    expect(await controller.createBulkTaxRecords(mockReq, { records: [] })).toEqual([]);
  });

  it("returns [] for a new user and never calls create or save", async () => {
    const mockRepo = {
      find: vi.fn().mockResolvedValue([]),
      create: vi.fn((r) => r),
      save: vi.fn().mockResolvedValue([]),
    };
    const mockProfileRepo = {
      findOne: vi.fn().mockResolvedValue(null),
    };

    const controller = new TaxController(mockRepo as any, mockProfileRepo as any);
    const result = await controller.getTaxRecords({ user: { id: "user-123" } });

    expect(result).toEqual([]);
    expect(mockRepo.find).toHaveBeenCalledWith({
      where: { userId: "user-123" },
      order: { date: "DESC" },
    });
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
    const controller = new TaxController(mockRepo as any, {} as any);
    const req = { user: { id: "u1" } };

    // Get single
    mockRepo.findOne.mockResolvedValueOnce(null);
    await expect(controller.getTaxRecord(req, "missing")).rejects.toThrow(NotFoundException);
    mockRepo.findOne.mockResolvedValueOnce({ id: "r1" });
    expect(await controller.getTaxRecord(req, "r1")).toEqual({ id: "r1" });

    // Create
    const created = await controller.createTaxRecord(req, { name: "Div", amount: 100 });
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
    const original = { id: "r-A", userId: "userA", name: "Rent", amount: 100, endDate: null };
    const taxRepo = createInMemoryRepository([original]);
    const profileRepo = createInMemoryRepository([
      { userId: "userB", hasResetFinancialData: true },
    ]);
    const controller = new TaxController(taxRepo as any, profileRepo as any);
    const userA = { user: { id: "userA" } };
    const userB = { user: { id: "userB" } };

    await expect(controller.getTaxRecord(userB, "r-A")).rejects.toThrow(NotFoundException);
    await expect(controller.updateTaxRecord(userB, "r-A", { amount: 1 })).rejects.toThrow(
      NotFoundException,
    );
    await expect(controller.deleteTaxRecord(userB, "r-A")).rejects.toThrow(NotFoundException);
    await controller.createBulkTaxRecords(userB, {
      records: [],
      capPreviousRecordIds: [{ id: "r-A", endDate: "2020-01-01" }],
    });

    expect(taxRepo.rows).toEqual([original]);
    expect(await controller.getTaxRecords(userB)).toEqual([]);
    expect((await controller.getTaxRecord(userA, "r-A")).name).toBe("Rent");
  });

  describe("tax record writes ignore client-supplied ids and ownership", () => {
    const setup = () => {
      const victim = { id: "r-A", userId: "userA", name: "Rent", amount: 100, endDate: null };
      const own = { id: "r-B", userId: "userB", name: "Mine", amount: 5, endDate: null };
      const taxRepo = createInMemoryRepository([victim, own]);
      const controller = new TaxController(taxRepo as any, {} as any);
      return { victim, own, taxRepo, controller, userB: { user: { id: "userB" } } };
    };

    it("createTaxRecord: B posting A's id leaves A's row unchanged and gets a fresh row", async () => {
      const { victim, taxRepo, controller, userB } = setup();

      const created = await controller.createTaxRecord(userB, {
        id: "r-A",
        userId: "userA",
        name: "Takeover",
        amount: 1,
      });

      expect(taxRepo.rows.find((r) => r.id === "r-A")).toEqual(victim);
      expect(created.id).not.toBe("r-A");
      expect(created.userId).toBe("userB");
      expect(created.name).toBe("Takeover");
    });

    it("createBulkTaxRecords: B bulk-posting A's id leaves A's row unchanged and gets a fresh row", async () => {
      const { victim, taxRepo, controller, userB } = setup();

      const created = await controller.createBulkTaxRecords(userB, {
        records: [{ id: "r-A", userId: "userA", name: "Takeover", amount: 1 } as any],
      });

      expect(taxRepo.rows.find((r) => r.id === "r-A")).toEqual(victim);
      expect(created[0].id).not.toBe("r-A");
      expect(created[0].userId).toBe("userB");
      expect(created[0].name).toBe("Takeover");
    });

    it("updateTaxRecord: PATCH with another id leaves both rows and ids unchanged but applies allowed fields", async () => {
      const { victim, taxRepo, controller, userB } = setup();

      const updated = await controller.updateTaxRecord(userB, "r-B", {
        id: "r-A",
        amount: 99,
      });

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

      await controller.updateTaxRecord(userB, "r-B", { userId: "other", name: "Renamed" });

      expect(taxRepo.rows.find((r) => r.id === "r-B")).toMatchObject({
        userId: "userB",
        name: "Renamed",
      });
    });
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
    return { repo, controller: new TaxController(repo as any, {} as any) };
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
});
