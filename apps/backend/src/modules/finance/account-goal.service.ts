import type { AccountGoalDto, UpsertAccountGoalRequest } from "@flump/api-contract";
import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { claimVersion, preconditionFailed } from "../../contract/etag";
import { Account } from "../../entities/account.entity";
import { AccountGoal } from "../../entities/account-goal.entity";

export function toPublicGoal(row: AccountGoal): AccountGoalDto {
  return {
    id: row.id,
    accountId: row.accountId,
    targetAmount:
      row.targetAmount !== null && row.targetAmount !== undefined ? Number(row.targetAmount) : null,
    targetDate: row.targetDate ?? null,
    label: row.label ?? null,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
  };
}

@Injectable()
export class AccountGoalService {
  constructor(
    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,
    @InjectRepository(AccountGoal)
    private readonly goalRepository: Repository<AccountGoal>,
  ) {}

  async getGoal(
    userId: string,
    accountId: string,
  ): Promise<{ goal: AccountGoalDto | null; updatedAt: Date | null }> {
    const account = await this.accountRepository.findOne({
      where: { id: accountId, userId },
      select: { id: true },
    });
    if (!account) {
      throw new NotFoundException("Account not found");
    }
    const row = await this.goalRepository.findOne({ where: { accountId, userId } });
    if (!row) return { goal: null, updatedAt: null };
    return { goal: toPublicGoal(row), updatedAt: row.updatedAt };
  }

  async upsertGoal(
    userId: string,
    accountId: string,
    input: UpsertAccountGoalRequest,
    expectedVersion?: Date,
  ): Promise<{ goal: AccountGoalDto; updatedAt: Date }> {
    return this.goalRepository.manager.transaction(async (em) => {
      const accountRepo = em.getRepository(Account);
      const goalRepo = em.getRepository(AccountGoal);

      const account = await accountRepo.findOne({
        where: { id: accountId, userId },
        select: { id: true },
      });
      if (!account) {
        throw new NotFoundException("Account not found");
      }

      const existing = await goalRepo.findOne({
        where: { accountId, userId },
        lock: { mode: "pessimistic_write" },
      });

      if (existing) {
        if (expectedVersion) {
          const claim = await claimVersion(
            goalRepo,
            { id: existing.id, user_id: userId },
            expectedVersion,
          );
          if (claim !== "updated") throw preconditionFailed();
        }
        const nextTargetAmount =
          input.targetAmount !== undefined ? (input.targetAmount ?? null) : existing.targetAmount;
        const nextTargetDate =
          input.targetDate !== undefined ? (input.targetDate ?? null) : existing.targetDate;
        const nextLabel =
          input.label !== undefined ? (input.label ? input.label : null) : existing.label;

        await goalRepo.update(
          { id: existing.id, userId },
          {
            targetAmount: nextTargetAmount,
            targetDate: nextTargetDate,
            label: nextLabel,
          },
        );
        const reloaded = await goalRepo.findOne({ where: { id: existing.id, userId } });
        const saved = reloaded ?? existing;
        return { goal: toPublicGoal(saved), updatedAt: saved.updatedAt };
      }

      if (expectedVersion) {
        throw preconditionFailed();
      }

      const created = goalRepo.create({
        userId,
        accountId,
        targetAmount: input.targetAmount ?? null,
        targetDate: input.targetDate ?? null,
        label: input.label ? input.label : null,
      });
      const saved = await goalRepo.save(created);
      return { goal: toPublicGoal(saved), updatedAt: saved.updatedAt };
    });
  }

  async deleteGoal(userId: string, accountId: string): Promise<{ deleted: boolean }> {
    const account = await this.accountRepository.findOne({
      where: { id: accountId, userId },
      select: { id: true },
    });
    if (!account) {
      throw new NotFoundException("Account not found");
    }
    const result = await this.goalRepository.delete({ accountId, userId });
    return { deleted: (result.affected ?? 0) > 0 };
  }
}
