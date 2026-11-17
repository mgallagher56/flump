import { BadRequestException, PreconditionFailedException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { RetirementPlan } from "../../entities/retirement-plan.entity";
import { RetirementController } from "./retirement.controller";
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

/**
 * A repository whose manager runs a transaction against `scoped`. `current` is the saved row (or
 * null). `claimMatches` drives the If-Match compare-and-set.
 */
function makeRepo(
  current: RetirementPlan | null,
  options: { updated?: RetirementPlan; claimMatches?: boolean } = {},
) {
  const qb = {
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    execute: vi.fn().mockResolvedValue({ affected: options.claimMatches === false ? 0 : 1 }),
    getCount: vi.fn().mockResolvedValue(current ? 1 : 0),
  };
  const scoped = {
    target: RetirementPlan,
    createQueryBuilder: vi.fn().mockReturnValue(qb),
    findOne: vi.fn().mockResolvedValue(current),
    update: vi.fn().mockResolvedValue({ affected: 1 }),
    findOneBy: vi.fn().mockResolvedValue(options.updated ?? current),
  };
  const repo = {
    target: RetirementPlan,
    findOne: vi.fn().mockResolvedValue(current),
    create: vi.fn((v: Partial<RetirementPlan>) => ({ ...v })),
    save: vi.fn(async (v: Partial<RetirementPlan>) => makePlanRow({ ...v })),
    update: vi.fn(),
    manager: {
      transaction: vi.fn(async (fn: (em: { getRepository: () => typeof scoped }) => unknown) =>
        fn({ getRepository: () => scoped }),
      ),
    },
  };
  return { repo, scoped, qb };
}

const notErased = () => ({ isErased: vi.fn().mockResolvedValue(false) });

describe("RetirementService.getPlan", () => {
  it("returns the default plan without writing when no row exists", async () => {
    const { repo } = makeRepo(null);
    const service = new RetirementService(repo as never, notErased() as never);

    const result = await service.getPlan("user_1");

    expect(result.updatedAt).toBeNull();
    expect(result.plan).toEqual({
      id: null,
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
      createdAt: null,
      updatedAt: null,
    });
    expect(repo.save).not.toHaveBeenCalled();
    expect(repo.create).not.toHaveBeenCalled();
    expect(repo.update).not.toHaveBeenCalled();
    expect(repo.manager.transaction).not.toHaveBeenCalled();
  });

  it("sets no ETag header when there is no saved row", async () => {
    const { repo } = makeRepo(null);
    const controller = new RetirementController(
      new RetirementService(repo as never, notErased() as never),
    );
    const res = { setHeader: vi.fn() };
    const body = await controller.getPlan({ user: { id: "user_1" } } as never, res as never);
    expect(body.plan.id).toBeNull();
    expect(res.setHeader).not.toHaveBeenCalled();
  });

  it("sets the ETag header from a saved row", async () => {
    const { repo } = makeRepo(makePlanRow());
    const controller = new RetirementController(
      new RetirementService(repo as never, notErased() as never),
    );
    const res = { setHeader: vi.fn() };
    await controller.getPlan({ user: { id: "user_1" } } as never, res as never);
    expect(res.setHeader).toHaveBeenCalledTimes(1);
  });
});

describe("RetirementService.upsertPlan", () => {
  it("creates the row on the first PUT", async () => {
    const { repo } = makeRepo(null);
    // No row inside the transaction either.
    const service = new RetirementService(repo as never, notErased() as never);

    const res = await service.upsertPlan("user_1", { retirementAge: 67 });

    expect(repo.save).toHaveBeenCalledTimes(1);
    expect(repo.create.mock.calls[0]?.[0]).toMatchObject({
      userId: "user_1",
      retirementAge: 67,
      planToAge: null,
      growthRates: { lower: 0.02, middle: 0.05, higher: 0.08 },
      excludedAccountIds: [],
    });
    expect(res.plan.retirementAge).toBe(67);
    expect(res.updatedAt).toBeInstanceOf(Date);
  });

  it("refuses to create a plan for an erased account", async () => {
    const { repo } = makeRepo(null);
    const service = new RetirementService(
      repo as never,
      { isErased: vi.fn().mockResolvedValue(true) } as never,
    );
    await expect(service.upsertPlan("user_1", { retirementAge: 67 })).rejects.toThrow();
    expect(repo.save).not.toHaveBeenCalled();
  });

  it("falls back to updating the winner when a concurrent first PUT created the row", async () => {
    const winner = makePlanRow({ planToAge: 95 });
    const { repo, scoped } = makeRepo(null);
    scoped.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(winner);
    scoped.findOneBy.mockResolvedValue(winner);
    repo.save.mockRejectedValueOnce(Object.assign(new Error("dup"), { code: "23505" }));
    const service = new RetirementService(repo as never, notErased() as never);

    await service.upsertPlan("user_1", { retirementAge: 67 });

    expect(scoped.update).toHaveBeenCalledWith(
      { id: winner.id, userId: "user_1" },
      { retirementAge: 67 },
    );
  });

  it("is a 412 when If-Match is sent but no plan has been saved", async () => {
    const { repo } = makeRepo(null);
    const service = new RetirementService(repo as never, notErased() as never);
    await expect(
      service.upsertPlan("user_1", { retirementAge: 67 }, new Date("2026-11-15T00:00:00.000Z")),
    ).rejects.toBeInstanceOf(PreconditionFailedException);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it("writes only the columns present in the request, under a row lock", async () => {
    const current = makePlanRow({ retirementAge: 60, planToAge: 90 });
    const { repo, scoped } = makeRepo(current);
    const service = new RetirementService(repo as never, notErased() as never);

    await service.upsertPlan("user_1", { inflationRate: 0.03 });

    expect(repo.manager.transaction).toHaveBeenCalledTimes(1);
    expect(scoped.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ lock: { mode: "pessimistic_write" } }),
    );
    expect(scoped.update).toHaveBeenCalledWith(
      { id: current.id, userId: "user_1" },
      { inflationRate: 0.03 },
    );
  });

  it("rejects stale If-Match versions with PreconditionFailedException", async () => {
    const current = makePlanRow();
    const { repo, scoped } = makeRepo(current, { claimMatches: false });
    const service = new RetirementService(repo as never, notErased() as never);

    await expect(
      service.upsertPlan(
        "user_1",
        { retirementAge: 67, planToAge: 90 },
        new Date("2026-11-15T00:00:00.000Z"),
      ),
    ).rejects.toBeInstanceOf(PreconditionFailedException);
    expect(scoped.update).not.toHaveBeenCalled();
  });

  it("rejects planToAge <= the saved retirementAge with a 400, writing nothing", async () => {
    const current = makePlanRow({ retirementAge: 67 });
    const { repo, scoped } = makeRepo(current);
    const service = new RetirementService(repo as never, notErased() as never);

    await expect(service.upsertPlan("user_1", { planToAge: 65 })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(scoped.update).not.toHaveBeenCalled();
  });

  it("rejects a retirementAge at or above the saved planToAge with a 400", async () => {
    const current = makePlanRow({ planToAge: 70 });
    const { repo, scoped } = makeRepo(current);
    const service = new RetirementService(repo as never, notErased() as never);

    await expect(service.upsertPlan("user_1", { retirementAge: 70 })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(scoped.update).not.toHaveBeenCalled();
  });

  it("maps the database age check firing to a 400, not a 500", async () => {
    const current = makePlanRow();
    const { repo, scoped } = makeRepo(current);
    scoped.update.mockRejectedValueOnce(
      Object.assign(new Error("check"), {
        driverError: { code: "23514", constraint: "CHK_retirement_plans_ages" },
      }),
    );
    const service = new RetirementService(repo as never, notErased() as never);

    await expect(service.upsertPlan("user_1", { retirementAge: 66 })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("maps the database age check on create to a 400", async () => {
    const { repo } = makeRepo(null);
    repo.save.mockRejectedValueOnce(
      Object.assign(new Error("check"), { code: "23514", constraint: "CHK_retirement_plans_ages" }),
    );
    const service = new RetirementService(repo as never, notErased() as never);
    await expect(service.upsertPlan("user_1", { retirementAge: 66 })).rejects.toBeInstanceOf(
      BadRequestException,
    );
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
    const { repo, qb } = makeRepo(current, { updated, claimMatches: true });
    const service = new RetirementService(repo as never, notErased() as never);

    const res = await service.upsertPlan(
      "user_1",
      { retirementAge: 67, planToAge: 90, target: { kind: "typed", yearlyAmount: 26_000 } },
      current.updatedAt,
    );
    expect(res.plan.retirementAge).toBe(67);
    expect(res.plan.planToAge).toBe(90);
    expect(res.plan.target).toEqual({ kind: "typed", yearlyAmount: 26_000 });
    expect(res.updatedAt).toEqual(nextUpdatedAt);
    // claimVersion takes column names: the owner column is "user_id".
    expect(qb.where.mock.calls[0]?.[0]).toContain(`"user_id" = :user_id`);
  });
});
