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
    expect(mockRepo.create).toHaveBeenCalledWith([
      expect.objectContaining({
        name: "Poplar Rent (2025/26)",
        userId: "user-123",
        amount: 1200,
      }),
    ]);
    expect(result).toHaveLength(1);
  });

  it("should not seed default tax records if user hasResetFinancialData is true", async () => {
    const mockRepo = {
      find: vi.fn().mockResolvedValue([]),
      save: vi.fn(),
    };
    const mockProfileRepo = {
      findOne: vi.fn().mockResolvedValue({ hasResetFinancialData: true }),
    };

    const controller = new TaxController(mockRepo as any, mockProfileRepo as any);
    const records = await controller.getTaxRecords({ user: { id: "user-123" } });

    expect(records).toEqual([]);
    expect(mockRepo.save).not.toHaveBeenCalled();
  });
});
