import type { RetirementPlanDto, UpsertRetirementPlanRequest } from "@flump/api-contract";
import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { accountDeletedException } from "../../auth/recent-login";
import { preconditionFailed, withVersionClaim } from "../../contract/etag";
import { RetirementPlan } from "../../entities/retirement-plan.entity";
import { AccountDeletionService } from "../privacy/account-deletion.service";

const DEFAULT_GROWTH_RATES = {
  lower: 0.02,
  middle: 0.05,
  higher: 0.08,
} as const;

export interface RetirementPlanView {
  plan: RetirementPlanDto;
  updatedAt: Date;
}

function isUniqueViolation(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const code =
    (err as { code?: string; driverError?: { code?: string } }).code ??
    (err as { driverError?: { code?: string } }).driverError?.code;
  return code === "23505";
}

function formatPlan(row: RetirementPlan): RetirementPlanDto {
  return {
    id: row.id,
    userId: row.userId,
    retirementAge: row.retirementAge,
    planToAge: row.planToAge,
    target: row.target,
    housingOverride: row.housingOverride,
    statePensionAge: row.statePensionAge,
    statePensionAnnualForecastGbp: row.statePensionAnnualForecastGbp,
    statePensionQualifyingYears: row.statePensionQualifyingYears,
    growthRates: row.growthRates ?? { ...DEFAULT_GROWTH_RATES },
    inflationRate: Number(row.inflationRate ?? 0.02),
    cashSavingsNominalRate:
      row.cashSavingsNominalRate === null || row.cashSavingsNominalRate === undefined
        ? null
        : Number(row.cashSavingsNominalRate),
    realRentGrowthRate: Number(row.realRentGrowthRate ?? 0),
    excludedAccountIds: Array.isArray(row.excludedAccountIds) ? row.excludedAccountIds : [],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

@Injectable()
export class RetirementService {
  constructor(
    @InjectRepository(RetirementPlan)
    private readonly retirementPlanRepository: Repository<RetirementPlan>,
    private readonly accountDeletion: AccountDeletionService,
  ) {}

  private async findOrCreatePlan(userId: string): Promise<RetirementPlan> {
    const existing = await this.retirementPlanRepository.findOne({ where: { userId } });
    if (existing) return existing;

    if (await this.accountDeletion.isErased(userId)) {
      throw accountDeletedException();
    }

    try {
      const created = this.retirementPlanRepository.create({
        userId,
        retirementAge: null,
        planToAge: null,
        target: null,
        housingOverride: null,
        statePensionAge: null,
        statePensionAnnualForecastGbp: null,
        statePensionQualifyingYears: null,
        growthRates: { ...DEFAULT_GROWTH_RATES },
        inflationRate: 0.02,
        cashSavingsNominalRate: null,
        realRentGrowthRate: 0,
        excludedAccountIds: [],
      });
      return await this.retirementPlanRepository.save(created);
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
      const winner = await this.retirementPlanRepository.findOne({ where: { userId } });
      if (!winner) throw err;
      return winner;
    }
  }

  async getPlan(userId: string): Promise<RetirementPlanView> {
    const row = await this.findOrCreatePlan(userId);
    return { plan: formatPlan(row), updatedAt: row.updatedAt };
  }

  async upsertPlan(
    userId: string,
    input: UpsertRetirementPlanRequest,
    expectedVersion?: Date,
  ): Promise<RetirementPlanView> {
    const current = await this.findOrCreatePlan(userId);

    const nextRetirementAge =
      input.retirementAge !== undefined ? input.retirementAge : current.retirementAge;
    const nextPlanToAge = input.planToAge !== undefined ? input.planToAge : current.planToAge;
    if (
      nextRetirementAge !== null &&
      nextPlanToAge !== null &&
      nextPlanToAge <= nextRetirementAge
    ) {
      throw new BadRequestException("planToAge must be greater than retirementAge.");
    }

    const patch: Partial<RetirementPlan> = {
      retirementAge: nextRetirementAge,
      planToAge: nextPlanToAge,
      target: input.target !== undefined ? input.target : current.target,
      housingOverride:
        input.housingOverride !== undefined ? input.housingOverride : current.housingOverride,
      statePensionAge:
        input.statePensionAge !== undefined ? input.statePensionAge : current.statePensionAge,
      statePensionAnnualForecastGbp:
        input.statePensionAnnualForecastGbp !== undefined
          ? input.statePensionAnnualForecastGbp
          : current.statePensionAnnualForecastGbp,
      statePensionQualifyingYears:
        input.statePensionQualifyingYears !== undefined
          ? input.statePensionQualifyingYears
          : current.statePensionQualifyingYears,
      growthRates: input.growthRates !== undefined ? input.growthRates : current.growthRates,
      inflationRate:
        input.inflationRate !== undefined ? input.inflationRate : current.inflationRate,
      cashSavingsNominalRate:
        input.cashSavingsNominalRate !== undefined
          ? input.cashSavingsNominalRate
          : current.cashSavingsNominalRate,
      realRentGrowthRate:
        input.realRentGrowthRate !== undefined
          ? input.realRentGrowthRate
          : current.realRentGrowthRate,
      excludedAccountIds:
        input.excludedAccountIds !== undefined
          ? input.excludedAccountIds
          : current.excludedAccountIds,
    };

    const updated = await withVersionClaim(
      this.retirementPlanRepository,
      { id: current.id, userId },
      expectedVersion,
      () => preconditionFailed(),
      async (repo) => {
        await repo.update({ id: current.id, userId }, patch);
        const row = await repo.findOneBy({ id: current.id });
        if (!row) throw preconditionFailed();
        return row;
      },
    );

    return { plan: formatPlan(updated), updatedAt: updated.updatedAt };
  }
}
