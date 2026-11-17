import type { RetirementPlanDto, UpsertRetirementPlanRequest } from "@flump/api-contract";
import type { RetirementSavedPlanInput } from "@flump/finance-engine";
import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { accountDeletedException } from "../../auth/recent-login";
import { claimVersion, preconditionFailed } from "../../contract/etag";
import { RetirementPlan } from "../../entities/retirement-plan.entity";
import { AccountDeletionService } from "../privacy/account-deletion.service";

const DEFAULT_GROWTH_RATES = {
  lower: 0.02,
  middle: 0.05,
  higher: 0.08,
} as const;

const AGE_ORDER_MESSAGE = "planToAge must be greater than retirementAge.";
const AGE_CHECK_CONSTRAINT = "CHK_retirement_plans_ages";

/** The columns a PUT may set; a request writes only the ones it carries. */
const PLAN_FIELDS = [
  "retirementAge",
  "planToAge",
  "target",
  "housingOverride",
  "statePensionAge",
  "statePensionAnnualForecastGbp",
  "statePensionQualifyingYears",
  "growthRates",
  "inflationRate",
  "cashSavingsNominalRate",
  "realRentGrowthRate",
  "excludedAccountIds",
] as const satisfies readonly (keyof UpsertRetirementPlanRequest & keyof RetirementPlan)[];

type PlanFields = Pick<RetirementPlan, (typeof PLAN_FIELDS)[number]>;

/** The plan a person has before saving anything (and the base of their first saved row). */
const defaultPlanFields = (): PlanFields => ({
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

export interface RetirementPlanView {
  plan: RetirementPlanDto;
  /** The saved row's version (its ETag), or null when nothing has been saved yet. */
  updatedAt: Date | null;
}

function driverCode(err: unknown): { code?: string; constraint?: string } {
  if (!err || typeof err !== "object") return {};
  const e = err as {
    code?: string;
    constraint?: string;
    driverError?: { code?: string; constraint?: string };
  };
  return {
    code: e.code ?? e.driverError?.code,
    constraint: e.constraint ?? e.driverError?.constraint,
  };
}

const isUniqueViolation = (err: unknown): boolean => driverCode(err).code === "23505";

/** The age CHECK firing (a write raced past the service's own check): a 400, never a 500. */
function isAgeCheckViolation(err: unknown): boolean {
  const { code, constraint } = driverCode(err);
  return code === "23514" && (constraint === undefined || constraint === AGE_CHECK_CONSTRAINT);
}

function assertAgeOrder(retirementAge: number | null, planToAge: number | null): void {
  if (retirementAge !== null && planToAge !== null && planToAge <= retirementAge) {
    throw new BadRequestException(AGE_ORDER_MESSAGE);
  }
}

/** Only the fields the request carries (`undefined` means "leave as saved"). */
function presentFields(input: UpsertRetirementPlanRequest): Partial<PlanFields> {
  const patch: Record<string, unknown> = {};
  for (const field of PLAN_FIELDS) {
    if (input[field] !== undefined) patch[field] = input[field];
  }
  return patch as Partial<PlanFields>;
}

function formatFields(userId: string, row: PlanFields) {
  return {
    userId,
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
  };
}

/**
 * A saved row as the engine's retirement builder reads it (`RetirementSavedPlanInput`): the same
 * numeric conversion as the API response, without the row id, user id or timestamps.
 */
export function savedPlanInputFromRow(row: RetirementPlan): RetirementSavedPlanInput {
  const { userId: _userId, ...fields } = formatFields(row.userId, row);
  return fields;
}

function formatPlan(row: RetirementPlan): RetirementPlanDto {
  return {
    id: row.id,
    ...formatFields(row.userId, row),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function defaultPlan(userId: string): RetirementPlanDto {
  return {
    id: null,
    ...formatFields(userId, defaultPlanFields()),
    createdAt: null,
    updatedAt: null,
  };
}

const view = (row: RetirementPlan): RetirementPlanView => ({
  plan: formatPlan(row),
  updatedAt: row.updatedAt,
});

@Injectable()
export class RetirementService {
  constructor(
    @InjectRepository(RetirementPlan)
    private readonly retirementPlanRepository: Repository<RetirementPlan>,
    private readonly accountDeletion: AccountDeletionService,
  ) {}

  /** The saved plan, or the default plan without writing anything when none is saved. */
  async getPlan(userId: string): Promise<RetirementPlanView> {
    const row = await this.retirementPlanRepository.findOne({ where: { userId } });
    if (!row) return { plan: defaultPlan(userId), updatedAt: null };
    return view(row);
  }

  /**
   * Saves the fields the request carries. The first PUT creates the row; later ones lock it, check
   * If-Match and the age order against the locked values, and write only the given columns, all
   * in one transaction, so concurrent partial PUTs never overwrite each other's fields.
   */
  async upsertPlan(
    userId: string,
    input: UpsertRetirementPlanRequest,
    expectedVersion?: Date,
  ): Promise<RetirementPlanView> {
    const patch = presentFields(input);
    try {
      const updated = await this.updateExisting(userId, patch, expectedVersion);
      if (updated) return view(updated);
      // Nothing saved yet, so an If-Match version can never match.
      if (expectedVersion) throw preconditionFailed();
      return view(await this.createPlan(userId, patch));
    } catch (err) {
      if (isAgeCheckViolation(err)) throw new BadRequestException(AGE_ORDER_MESSAGE);
      throw err;
    }
  }

  /** Locked read-check-write of the saved row; null when the user has no row. */
  private updateExisting(
    userId: string,
    patch: Partial<PlanFields>,
    expectedVersion: Date | undefined,
  ): Promise<RetirementPlan | null> {
    return this.retirementPlanRepository.manager.transaction(async (em) => {
      const repo = em.getRepository(RetirementPlan);
      const current = await repo.findOne({
        where: { userId },
        lock: { mode: "pessimistic_write" },
      });
      if (!current) return null;
      if (expectedVersion) {
        // claimVersion takes column names, so the owner is "user_id".
        const claim = await claimVersion(
          repo,
          { id: current.id, user_id: userId },
          expectedVersion,
        );
        if (claim !== "updated") throw preconditionFailed();
      }
      assertAgeOrder(
        patch.retirementAge !== undefined ? patch.retirementAge : current.retirementAge,
        patch.planToAge !== undefined ? patch.planToAge : current.planToAge,
      );
      if (Object.keys(patch).length > 0) {
        await repo.update({ id: current.id, userId }, patch);
      }
      const row = await repo.findOneBy({ id: current.id });
      if (!row) throw preconditionFailed();
      return row;
    });
  }

  /** The first PUT. A concurrent first PUT that won the insert is updated instead. */
  private async createPlan(userId: string, patch: Partial<PlanFields>): Promise<RetirementPlan> {
    if (await this.accountDeletion.isErased(userId)) {
      throw accountDeletedException();
    }
    const fields = { ...defaultPlanFields(), ...patch };
    assertAgeOrder(fields.retirementAge, fields.planToAge);
    try {
      return await this.retirementPlanRepository.save(
        this.retirementPlanRepository.create({ userId, ...fields }),
      );
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
      const winner = await this.updateExisting(userId, patch, undefined);
      if (!winner) throw err;
      return winner;
    }
  }
}
