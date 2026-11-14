import { BadRequestException } from "@nestjs/common";
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
