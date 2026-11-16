import { BadRequestException, PreconditionFailedException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { RetirementPlan } from "../../entities/retirement-plan.entity";
import { RetirementService } from "./retirement.service";

function makePlanRow(overrides: Partial<RetirementPlan> = {}): RetirementPlan {
  const now = new Date("2026-11-16T10:00:00.000Z");
  return {
    id: "11111111-1111-4111-8111-111111111111",
    userId: "user_1",
    retirementAge: null,
    planToAge: null,
    target: null,
    housingOverride: null,
    statePensionAge: null,
    statePensionAnnualForecastGbp: null,
    statePensionQualifyingYears: null,
    growthRates: { lower: 0.02, middle: 0.05, higher: 0.08 },
    inflationRate: 0.02,
    cashSavingsNominalRate: null,
    realRentGrowthRate: 0,
    excludedAccountIds: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeVersionClaimRepo(
  current: RetirementPlan,
  updated?: RetirementPlan,
  claimMatches = true,
) {
  const qb = {
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    andWhere: vi.fn().mockReturnThis(),
    execute: vi.fn().mockResolvedValue({ affected: claimMatches ? 1 : 0 }),
    getCount: vi.fn().mockResolvedValue(1),
  };
  const scopedRepo = {
    target: RetirementPlan,
    createQueryBuilder: vi.fn().mockReturnValue(qb),
    update: vi.fn().mockResolvedValue({ affected: 1 }),
    findOneBy: vi.fn().mockResolvedValue(updated ?? current),
  };
  const repo = {
    target: RetirementPlan,
    findOne: vi.fn().mockResolvedValue(current),
    update: vi.fn().mockResolvedValue({ affected: 1 }),
    findOneBy: vi.fn().mockResolvedValue(updated ?? current),
    manager: {
      transaction: vi.fn(async (fn: (em: { getRepository: () => typeof scopedRepo }) => unknown) =>
        fn({ getRepository: () => scopedRepo }),
      ),
    },
  };
  return { repo, scopedRepo };
}

describe("RetirementService", () => {
  it("lazily creates a default empty plan on first GET", async () => {
    const created = makePlanRow();
    const repo = {
      findOne: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockReturnValue(created),
      save: vi.fn().mockResolvedValue(created),
    };
    const accountDeletion = { isErased: vi.fn().mockResolvedValue(false) };

    const service = new RetirementService(repo as never, accountDeletion as never);
    const result = await service.getPlan("user_1");

    expect(result.plan.retirementAge).toBeNull();
    expect(result.plan.planToAge).toBeNull();
    expect(result.plan.growthRates).toEqual({ lower: 0.02, middle: 0.05, higher: 0.08 });
    expect(result.plan.inflationRate).toBe(0.02);
    expect(repo.save).toHaveBeenCalledTimes(1);
  });

  it("rejects stale If-Match versions with PreconditionFailedException", async () => {
    const current = makePlanRow();
    const { repo } = makeVersionClaimRepo(current, current, false);
    const service = new RetirementService(
      repo as never,
      { isErased: vi.fn().mockResolvedValue(false) } as never,
    );

    await expect(
      service.upsertPlan(
        "user_1",
        { retirementAge: 67, planToAge: 90 },
        new Date("2026-11-15T00:00:00.000Z"),
      ),
    ).rejects.toBeInstanceOf(PreconditionFailedException);
  });

  it("rejects planToAge <= retirementAge", async () => {
    const current = makePlanRow({ retirementAge: 67 });
    const { repo, scopedRepo } = makeVersionClaimRepo(current);
    const service = new RetirementService(
      repo as never,
      { isErased: vi.fn().mockResolvedValue(false) } as never,
    );

    await expect(service.upsertPlan("user_1", { planToAge: 65 })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(scopedRepo.update).not.toHaveBeenCalled();
  });

  it("updates and returns the formatted plan when If-Match matches", async () => {
    const current = makePlanRow();
    const nextUpdatedAt = new Date("2026-11-16T10:05:00.000Z");
    const updated = makePlanRow({
      retirementAge: 67,
      planToAge: 90,
      target: { kind: "typed", yearlyAmount: 26_000 },
      updatedAt: nextUpdatedAt,
    });
    const { repo } = makeVersionClaimRepo(current, updated, true);
    const service = new RetirementService(
      repo as never,
      { isErased: vi.fn().mockResolvedValue(false) } as never,
    );

    const res = await service.upsertPlan(
      "user_1",
      { retirementAge: 67, planToAge: 90, target: { kind: "typed", yearlyAmount: 26_000 } },
      current.updatedAt,
    );
    expect(res.plan.retirementAge).toBe(67);
    expect(res.plan.planToAge).toBe(90);
    expect(res.plan.target).toEqual({ kind: "typed", yearlyAmount: 26_000 });
    expect(res.updatedAt).toEqual(nextUpdatedAt);
  });
});
