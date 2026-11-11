import { NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { TaxController } from "./tax.controller";

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
          name: "Poplar Rent (2025/26)",
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

  it("should seed default tax records when empty and not reset, and skip if reset", async () => {
    const mockRepo = {
      find: vi
        .fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ id: "r1", name: "Seeded" }]),
      create: vi.fn((r) => r),
      save: vi.fn().mockResolvedValue([]),
    };
    const mockProfileRepo = {
      findOne: vi.fn().mockResolvedValue(null),
    };

    const controller = new TaxController(mockRepo as any, mockProfileRepo as any);
    const seeded = await controller.getTaxRecords({ user: { id: "user-123" } });
    expect(seeded).toHaveLength(1);
    expect(mockRepo.save).toHaveBeenCalled();

    // When hasResetFinancialData is true
    mockRepo.find.mockResolvedValueOnce([]);
    mockRepo.save.mockClear();
    mockProfileRepo.findOne.mockResolvedValueOnce({ hasResetFinancialData: true });
    const empty = await controller.getTaxRecords({ user: { id: "user-123" } });
    expect(empty).toEqual([]);
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
});
