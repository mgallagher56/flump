import { NotFoundException, PreconditionFailedException } from "@nestjs/common";
import type { Repository } from "typeorm";
import { describe, expect, it, vi } from "vitest";
import { Account } from "../../entities/account.entity";
import { AccountGoal } from "../../entities/account-goal.entity";
import { AccountGoalService, toPublicGoal } from "./account-goal.service";

const makeGoalRow = (overrides: Partial<AccountGoal> = {}): AccountGoal => ({
  id: "g-1",
  userId: "u-1",
  accountId: "a-1",
  targetAmount: 50,
  targetDate: "2027-06-01",
  label: "Emergency",
  createdAt: new Date("2026-11-01T10:00:00.000Z"),
  updatedAt: new Date("2026-11-02T10:00:00.000Z"),
  ...overrides,
});

describe("AccountGoalService", () => {
  it("converts targetAmount 0 to 0 rather than null", () => {
    const dto = toPublicGoal(makeGoalRow({ targetAmount: 0 }));
    expect(dto.targetAmount).toBe(0);
  });

  it("throws NotFoundException when the account does not belong to the user", async () => {
    const accountRepo = {
      findOne: vi.fn().mockResolvedValue(null),
    } as unknown as Repository<Account>;
    const goalRepo = { findOne: vi.fn() } as unknown as Repository<AccountGoal>;
    const service = new AccountGoalService(accountRepo, goalRepo);

    await expect(service.getGoal("u-1", "a-missing")).rejects.toBeInstanceOf(NotFoundException);
    expect(goalRepo.findOne).not.toHaveBeenCalled();
  });

  it("returns null goal when none is set on an owned account", async () => {
    const accountRepo = {
      findOne: vi.fn().mockResolvedValue({ id: "a-1" }),
    } as unknown as Repository<Account>;
    const goalRepo = {
      findOne: vi.fn().mockResolvedValue(null),
    } as unknown as Repository<AccountGoal>;
    const service = new AccountGoalService(accountRepo, goalRepo);

    const result = await service.getGoal("u-1", "a-1");
    expect(result).toEqual({ goal: null, updatedAt: null });
  });

  it("returns the saved goal and updatedAt when present", async () => {
    const row = makeGoalRow();
    const accountRepo = {
      findOne: vi.fn().mockResolvedValue({ id: "a-1" }),
    } as unknown as Repository<Account>;
    const goalRepo = {
      findOne: vi.fn().mockResolvedValue(row),
    } as unknown as Repository<AccountGoal>;
    const service = new AccountGoalService(accountRepo, goalRepo);

    const result = await service.getGoal("u-1", "a-1");
    expect(result.goal).toEqual({
      id: "g-1",
      accountId: "a-1",
      targetAmount: 50,
      targetDate: "2027-06-01",
      label: "Emergency",
      createdAt: "2026-11-01T10:00:00.000Z",
      updatedAt: "2026-11-02T10:00:00.000Z",
    });
    expect(result.updatedAt).toEqual(row.updatedAt);
  });

  it("rejects If-Match with 412 when no goal exists yet", async () => {
    const accountRepo = {} as Repository<Account>;
    const txAccountRepo = { findOne: vi.fn().mockResolvedValue({ id: "a-1" }) };
    const txGoalRepo = { findOne: vi.fn().mockResolvedValue(null) };
    const goalRepo = {
      manager: {
        transaction: vi.fn(async (cb) =>
          cb({
            getRepository: (e: unknown) => (e === Account ? txAccountRepo : txGoalRepo),
          }),
        ),
      },
    } as unknown as Repository<AccountGoal>;
    const service = new AccountGoalService(accountRepo, goalRepo);

    await expect(
      service.upsertGoal("u-1", "a-1", { targetAmount: 100 }, new Date("2026-11-01T00:00:00.000Z")),
    ).rejects.toBeInstanceOf(PreconditionFailedException);
  });

  it("creates a goal on upsert when none exists and no If-Match is sent", async () => {
    const saved = makeGoalRow({ targetAmount: 50000, targetDate: null, label: null });
    const accountRepo = {} as Repository<Account>;
    const txAccountRepo = { findOne: vi.fn().mockResolvedValue({ id: "a-1" }) };
    const txGoalRepo = {
      findOne: vi.fn().mockResolvedValue(null),
      create: vi.fn((data) => data),
      save: vi.fn().mockResolvedValue(saved),
    };
    const goalRepo = {
      manager: {
        transaction: vi.fn(async (cb) =>
          cb({
            getRepository: (e: unknown) => (e === Account ? txAccountRepo : txGoalRepo),
          }),
        ),
      },
    } as unknown as Repository<AccountGoal>;
    const service = new AccountGoalService(accountRepo, goalRepo);

    const result = await service.upsertGoal("u-1", "a-1", { targetAmount: 50000 });
    expect(result.goal.targetAmount).toBe(50000);
    expect(txGoalRepo.save).toHaveBeenCalledOnce();
  });

  it("deletes a goal for an owned account and returns deleted: true", async () => {
    const accountRepo = {
      findOne: vi.fn().mockResolvedValue({ id: "a-1" }),
    } as unknown as Repository<Account>;
    const goalRepo = {
      delete: vi.fn().mockResolvedValue({ affected: 1 }),
    } as unknown as Repository<AccountGoal>;
    const service = new AccountGoalService(accountRepo, goalRepo);

    expect(await service.deleteGoal("u-1", "a-1")).toEqual({ deleted: true });
    expect(goalRepo.delete).toHaveBeenCalledWith({ accountId: "a-1", userId: "u-1" });
  });
});
