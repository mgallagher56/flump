import {
  getUkCalendarDate,
  type MonthlyPortfolioHistoryPoint,
  PortfolioSnapshot,
  type ResolvedAccount,
} from "@flump/finance-engine";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { Account } from "./entities/account.entity";
import { AccountDetail } from "./entities/account-detail.entity";
import { BankConnection } from "./entities/bank-connection.entity";
import { UserProfile } from "./entities/user-profile.entity";

export type AccountType =
  | "Current"
  | "Saving"
  | "Mortgage"
  | "Loan"
  | "Credit Card"
  | "Owed"
  | "Investment"
  | "Pension"
  | "Property"
  | "Student Loan"
  | "Overdraft";

export const STUDENT_LOAN_PLANS = ["PLAN_1", "PLAN_2", "PLAN_4", "PLAN_5", "POSTGRAD"] as const;

export interface AccountWithDetails
  extends Omit<Account, "balance" | "interestRate" | "monthlyContribution"> {
  balance: number;
  interestRate: number | null;
  monthlyContribution: number | null;
  isCurrent: boolean;
  details: AccountDetail[];
}

export interface CreateAccountDto {
  name: string;
  type: AccountType | string;
  balance: number;
  currency?: string;
  interestRate?: number | null;
  monthlyContribution?: number | null;
  /** Mortgage term in months (1..600). Meaningful for Mortgage accounts; null otherwise. */
  termMonths?: number | null;
  /** End of the fixed-rate period, ISO date (YYYY-MM-DD). Meaningful for Mortgage accounts. */
  fixedRateEndDate?: string | null;
  /** Student Loan accounts only. */
  studentLoanPlan?: (typeof STUDENT_LOAN_PLANS)[number] | null;
  isCurrent?: boolean;
  connectionId?: string | null;
  externalAccountId?: string | null;
}

export type UpdateAccountDto = Partial<CreateAccountDto>;

export interface PortfolioSnapshotResponse {
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  totalLiquidCash: number;
  totalInvestments: number;
  totalPensions: number;
  totalConsumerDebt: number;
  totalMortgageBalance: number;
  totalProperty: number;
  /** Income-contingent: excluded from netWorth, totalLiabilities and debt totals (D-5-B). */
  totalStudentLoans: number;
  resolvedAccounts: ResolvedAccount[];
  monthlyHistory: MonthlyPortfolioHistoryPoint[];
  currency: string;
}

export const DEFAULT_ACCOUNT_CURRENCY = "GBP";

export const MIN_TERM_MONTHS = 1;
export const MAX_TERM_MONTHS = 600;

function validateTermMonths(value: unknown): number | null | undefined {
  if (value === undefined || value === null) return value;
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < MIN_TERM_MONTHS ||
    value > MAX_TERM_MONTHS
  ) {
    throw new BadRequestException(
      `termMonths must be an integer between ${MIN_TERM_MONTHS} and ${MAX_TERM_MONTHS}, or null`,
    );
  }
  return value;
}

function validateFixedRateEndDate(value: unknown): string | null | undefined {
  if (value === undefined || value === null) return value;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    if (!Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value) {
      return value;
    }
  }
  throw new BadRequestException("fixedRateEndDate must be an ISO date (YYYY-MM-DD) or null");
}

function validateStudentLoanPlan(value: unknown): string | null | undefined {
  if (value === undefined || value === null) return value;
  if (typeof value === "string" && (STUDENT_LOAN_PLANS as readonly string[]).includes(value)) {
    return value;
  }
  throw new BadRequestException(
    `studentLoanPlan must be one of ${STUDENT_LOAN_PLANS.join(", ")}, or null`,
  );
}

export const MAX_BALANCE_BATCH = 100;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface BalanceUpdateDto {
  id: string;
  balance: number;
}

export interface UpdateBalancesDto {
  balances: BalanceUpdateDto[];
}

/** Validates the PATCH /accounts/balances body; throws 400 on anything malformed. */
export function validateBalanceUpdates(body: unknown): BalanceUpdateDto[] {
  const balances = (body as { balances?: unknown } | null | undefined)?.balances;
  if (!Array.isArray(balances) || balances.length === 0) {
    throw new BadRequestException("balances must be a non-empty array");
  }
  if (balances.length > MAX_BALANCE_BATCH) {
    throw new BadRequestException(`balances must have at most ${MAX_BALANCE_BATCH} entries`);
  }
  const seen = new Set<string>();
  return balances.map((entry: unknown) => {
    const { id, balance } = (entry ?? {}) as Record<string, unknown>;
    if (typeof id !== "string" || !UUID_PATTERN.test(id)) {
      throw new BadRequestException("each balance entry needs a uuid id");
    }
    if (typeof balance !== "number" || !Number.isFinite(balance) || Math.abs(balance) >= 1e10) {
      throw new BadRequestException("each balance must be a finite number below 10 billion");
    }
    const key = id.toLowerCase();
    if (seen.has(key)) {
      throw new BadRequestException("each account may appear once in balances");
    }
    seen.add(key);
    return { id, balance };
  });
}

/** Current year and month on the UK calendar (not the server's UTC date). */
export function currentUkYearMonth(now: Date = new Date()): { year: number; month: number } {
  const [year, month] = getUkCalendarDate(now).split("-").map(Number);
  return { year: year as number, month: month as number };
}

export interface DeleteAccountResponse {
  success: boolean;
}

export interface IAccountIntake {
  getAccounts(userId: string): Promise<AccountWithDetails[]>;
  getAccount(userId: string, id: string): Promise<AccountWithDetails>;
  getAccountDetails(userId: string, accountId?: string): Promise<AccountDetail[]>;
  createAccount(userId: string, body: CreateAccountDto): Promise<Account>;
  updateAccount(userId: string, id: string, body: UpdateAccountDto): Promise<Account>;
  updateBalances(userId: string, body: UpdateBalancesDto): Promise<Account[]>;
  deleteAccount(userId: string, id: string): Promise<DeleteAccountResponse>;
  getPortfolioSnapshot(userId: string): Promise<PortfolioSnapshotResponse>;
}

@Injectable()
export class AccountIntakeService implements IAccountIntake {
  constructor(
    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,
    @InjectRepository(AccountDetail)
    private readonly accountDetailRepository: Repository<AccountDetail>,
    @InjectRepository(UserProfile)
    private readonly userProfileRepository: Repository<UserProfile>,
    @InjectRepository(BankConnection)
    private readonly bankConnectionRepository: Repository<BankConnection>,
  ) {}

  /**
   * Allow-list of client-writable account fields. `id`, `userId` and
   * `connectionId` are never copied from a request body.
   */
  private pickAccountFields(
    body: CreateAccountDto | UpdateAccountDto,
    isCreate = false,
  ): Partial<Account> {
    // The repayment plan only applies to Student Loans. Any other type stores null: an update
    // that sets a different type clears it, and a create ignores a supplied plan.
    const validatedPlan = validateStudentLoanPlan(body.studentLoanPlan);
    let studentLoanPlan = validatedPlan;
    if (body.type !== undefined && body.type !== "Student Loan") {
      studentLoanPlan = isCreate && validatedPlan === undefined ? undefined : null;
    }
    const fields = {
      name: body.name,
      type: body.type,
      balance: body.balance,
      currency: body.currency,
      interestRate: body.interestRate,
      monthlyContribution: body.monthlyContribution,
      termMonths: validateTermMonths(body.termMonths),
      fixedRateEndDate: validateFixedRateEndDate(body.fixedRateEndDate),
      studentLoanPlan,
      isCurrent: body.isCurrent,
      externalAccountId: body.externalAccountId,
    };
    // currency is NOT NULL: null or "" means "not provided" (create defaults it, update keeps it).
    return Object.fromEntries(
      Object.entries(fields).filter(
        ([key, value]) =>
          value !== undefined && !(key === "currency" && (value === null || value === "")),
      ),
    ) as Partial<Account>;
  }

  async getAccounts(userId: string): Promise<AccountWithDetails[]> {
    const accounts = await this.accountRepository.find({
      where: { userId },
      order: { createdAt: "ASC" },
    });

    const accountIds = accounts.map((a) => a.id);
    let details: AccountDetail[] = [];
    if (accountIds.length > 0) {
      details = await this.accountDetailRepository.find({
        where: { accountId: In(accountIds) },
        order: { year: "ASC", month: "ASC" },
      });
    }

    const detailsByAccount = details.reduce(
      (acc, d) => {
        if (!acc[d.accountId]) acc[d.accountId] = [];
        acc[d.accountId].push(d);
        return acc;
      },
      {} as Record<string, AccountDetail[]>,
    );

    return accounts.map((acc) => ({
      ...acc,
      balance: Number(acc.balance),
      interestRate:
        acc.interestRate !== null && acc.interestRate !== undefined
          ? Number(acc.interestRate)
          : null,
      monthlyContribution:
        acc.monthlyContribution !== null && acc.monthlyContribution !== undefined
          ? Number(acc.monthlyContribution)
          : null,
      isCurrent: acc.isCurrent !== false,
      details: detailsByAccount[acc.id] || [],
    }));
  }

  async getAccount(userId: string, id: string): Promise<AccountWithDetails> {
    const account = await this.accountRepository.findOne({
      where: { id, userId },
    });
    if (!account) {
      throw new NotFoundException("Account not found");
    }

    const details = await this.accountDetailRepository.find({
      where: { accountId: id },
      order: { year: "ASC", month: "ASC" },
    });

    return {
      ...account,
      balance: Number(account.balance),
      interestRate:
        account.interestRate !== null && account.interestRate !== undefined
          ? Number(account.interestRate)
          : null,
      monthlyContribution:
        account.monthlyContribution !== null && account.monthlyContribution !== undefined
          ? Number(account.monthlyContribution)
          : null,
      isCurrent: account.isCurrent !== false,
      details,
    };
  }

  async getAccountDetails(userId: string, accountId?: string): Promise<AccountDetail[]> {
    if (accountId) {
      // Verify account belongs to user
      const account = await this.accountRepository.findOne({
        where: { id: accountId, userId },
      });
      if (!account) {
        throw new NotFoundException("Account not found");
      }
      return this.accountDetailRepository.find({
        where: { accountId },
        order: { year: "ASC", month: "ASC" },
      });
    }

    const accounts = await this.accountRepository.find({
      where: { userId },
      select: { id: true },
    });
    if (accounts.length === 0) {
      return [];
    }

    const accountIds = accounts.map((a) => a.id);
    return this.accountDetailRepository.find({
      where: { accountId: In(accountIds) },
      order: { year: "ASC", month: "ASC" },
    });
  }

  async createAccount(userId: string, body: CreateAccountDto): Promise<Account> {
    const fields = this.pickAccountFields(body, true);
    if (body.connectionId) {
      const connection = await this.bankConnectionRepository.findOne({
        where: { id: body.connectionId, userId },
      });
      if (!connection) {
        throw new NotFoundException("Bank connection not found");
      }
      fields.connectionId = connection.id;
    }
    const account: Account = this.accountRepository.create({
      ...fields,
      // accounts.currency is NOT NULL and the DTO leaves it optional, so default it here.
      currency: fields.currency || DEFAULT_ACCOUNT_CURRENCY,
      userId,
    });
    return this.accountRepository.save(account);
  }

  /**
   * Runs `work` in one DB transaction with transaction-bound repositories. Test doubles without
   * a TypeORM manager run it directly on the injected repositories.
   */
  private runInTransaction<T>(
    work: (accounts: Repository<Account>, details: Repository<AccountDetail>) => Promise<T>,
  ): Promise<T> {
    const manager = this.accountRepository.manager;
    if (!manager?.transaction) return work(this.accountRepository, this.accountDetailRepository);
    return manager.transaction((em) =>
      work(em.getRepository(Account), em.getRepository(AccountDetail)),
    );
  }

  /** Month-end snapshot for the current UK month: one row per account per month (E23 D22). */
  private upsertCurrentMonthHistory(
    details: Repository<AccountDetail>,
    accountId: string,
    value: number,
  ): Promise<unknown> {
    const { year, month } = currentUkYearMonth();
    return details.upsert({ accountId, year, month, value }, ["accountId", "year", "month"]);
  }

  async updateAccount(userId: string, id: string, body: UpdateAccountDto): Promise<Account> {
    return this.runInTransaction(async (accounts, details) => {
      const account = await accounts.findOne({ where: { id, userId } });
      if (!account) {
        throw new NotFoundException("Account not found");
      }

      Object.assign(account, this.pickAccountFields(body));
      const saved = await accounts.save(account);
      if (body.balance !== undefined && body.balance !== null) {
        await this.upsertCurrentMonthHistory(details, id, Number(saved.balance));
      }
      return saved;
    });
  }

  /**
   * Check-in: sets every listed balance and upserts its current-month history row in one
   * transaction. An unknown or foreign id fails the whole batch with 404 and writes nothing.
   */
  async updateBalances(userId: string, body: UpdateBalancesDto): Promise<Account[]> {
    const updates = validateBalanceUpdates(body);
    return this.runInTransaction(async (accounts, details) => {
      const owned = await accounts.find({
        where: { id: In(updates.map((u) => u.id)), userId },
      });
      const byId = new Map(owned.map((a) => [a.id, a]));
      if (updates.some((u) => !byId.has(u.id))) {
        throw new NotFoundException("Account not found");
      }

      const result: Account[] = [];
      for (const { id, balance } of updates) {
        const account = byId.get(id) as Account;
        account.balance = balance;
        const saved = await accounts.save(account);
        await this.upsertCurrentMonthHistory(details, id, Number(saved.balance));
        result.push(saved);
      }
      return result;
    });
  }

  async deleteAccount(userId: string, id: string): Promise<DeleteAccountResponse> {
    const account = await this.accountRepository.findOne({
      where: { id, userId },
    });
    if (!account) {
      throw new NotFoundException("Account not found");
    }

    await this.accountDetailRepository.delete({ accountId: id });
    await this.accountRepository.remove(account);
    return { success: true };
  }

  async getPortfolioSnapshot(userId: string): Promise<PortfolioSnapshotResponse> {
    const accounts = await this.getAccounts(userId);
    const details = await this.getAccountDetails(userId);
    const snapshot = new PortfolioSnapshot(accounts, details);

    return {
      netWorth: snapshot.getTotalNetWorth(),
      totalAssets: snapshot.getTotalAssets(),
      totalLiabilities: snapshot.getTotalLiabilities(),
      totalLiquidCash: snapshot.getTotalLiquidCash(),
      totalInvestments: snapshot.getTotalInvestments(),
      totalPensions: snapshot.getTotalPensions(),
      totalConsumerDebt: snapshot.getTotalConsumerDebt(),
      totalMortgageBalance: snapshot.getTotalMortgageBalance(),
      totalProperty: snapshot.getTotalProperty(),
      totalStudentLoans: snapshot.getTotalStudentLoans(),
      resolvedAccounts: snapshot.getResolvedAccounts(),
      monthlyHistory: snapshot.getMonthlyHistory(),
      currency: accounts[0]?.currency || "GBP",
    };
  }
}
