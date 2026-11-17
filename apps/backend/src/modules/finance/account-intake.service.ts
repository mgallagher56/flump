import {
  ACCOUNT_SUBTYPES,
  ACCOUNT_SUBTYPES_BY_TYPE,
  ACCOUNT_TYPES,
  CREDIT_FIELD_ACCOUNT_TYPES,
} from "@flump/api-contract";
import {
  type AccountOwnership,
  canAccountBeJoint,
  DEFAULT_JOINT_SHARE_PERCENT,
  type MonthlyPortfolioHistoryPoint,
  type NetWorthLeftOut,
  netWorthBasisFromProfile,
  PortfolioSnapshot,
  type ResolvedAccount,
  resolveSnapshotNetWorthScope,
} from "@flump/finance-engine";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { recordAuditEvent } from "../../audit/audit-events";
import { claimVersion, preconditionFailed } from "../../contract/etag";
import {
  type KeysetOrder,
  keysetPage,
  type Page,
  type PageRequest,
} from "../../contract/pagination";
import { Account } from "../../entities/account.entity";
import { AccountDetail } from "../../entities/account-detail.entity";
import { BankConnection } from "../../entities/bank-connection.entity";
import { Transaction } from "../../entities/transaction.entity";
import { UserProfile } from "../../entities/user-profile.entity";
import { londonDate } from "../snapshots/london-date";
import { resignHistoryForType, storedBalance } from "../snapshots/stored-balance";

type AccountType = (typeof ACCOUNT_TYPES)[number];
type AccountSubtype = (typeof ACCOUNT_SUBTYPES)[number];

const STUDENT_LOAN_PLANS = ["PLAN_1", "PLAN_2", "PLAN_4", "PLAN_5", "POSTGRAD"] as const;

export interface AccountWithDetails extends Account {
  details: AccountDetail[];
}

export interface CreateAccountDto {
  name: string;
  type: AccountType | string;
  accountSubtype?: AccountSubtype | string | null;
  balance: number;
  /** null or "" means "not provided" (create defaults it, update keeps it). */
  currency?: string | null;
  interestRate?: number | null;
  monthlyContribution?: number | null;
  creditLimit?: number | null;
  promoZeroPercentUntil?: string | null;
  /** Mortgage term in months (1..600). Meaningful for Mortgage accounts; null otherwise. */
  termMonths?: number | null;
  /** End of the fixed-rate period, ISO date (YYYY-MM-DD). Meaningful for Mortgage accounts. */
  fixedRateEndDate?: string | null;
  /** Student Loan accounts only. */
  studentLoanPlan?: (typeof STUDENT_LOAN_PLANS)[number] | null;
  ownership?: AccountOwnership;
  sharePercent?: number | null;
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
  /** Income-contingent, so never in debt totals (D-5-B); in net worth only when the user counts it. */
  totalStudentLoans: number;
  resolvedAccounts: ResolvedAccount[];
  monthlyHistory: MonthlyPortfolioHistoryPoint[];
  /** What net worth leaves out under the user's own choices, in display order. */
  netWorthLeavesOut: NetWorthLeftOut[];
  currency: string;
}

const DEFAULT_ACCOUNT_CURRENCY = "GBP";

const MIN_TERM_MONTHS = 1;
const MAX_TERM_MONTHS = 600;

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

function validateIsoDate(value: unknown, fieldName: string): string | null | undefined {
  if (value === undefined || value === null) return value;
  // No regex on user input: a 10-character string that survives the UTC round trip unchanged is
  // exactly a real YYYY-MM-DD date (toISOString always writes that form for years 0000-9999).
  if (typeof value === "string" && value.length === 10) {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    if (
      !Number.isNaN(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === value &&
      parsed.getUTCFullYear() >= 1
    ) {
      return value;
    }
  }
  throw new BadRequestException(`${fieldName} must be an ISO date (YYYY-MM-DD) or null`);
}

function validateAccountSubtype(value: unknown): AccountSubtype | null | undefined {
  if (value === undefined || value === null) return value;
  if (typeof value === "string" && (ACCOUNT_SUBTYPES as readonly string[]).includes(value)) {
    return value as AccountSubtype;
  }
  throw new BadRequestException(
    `accountSubtype must be one of ${ACCOUNT_SUBTYPES.join(", ")}, or null`,
  );
}

/** True when `type` takes the subtype (`ACCOUNT_SUBTYPES_BY_TYPE`). */
function subtypeAppliesTo(type: string | undefined, subtype: string): boolean {
  const allowed = type ? ACCOUNT_SUBTYPES_BY_TYPE[type as AccountType] : undefined;
  return Boolean(allowed && (allowed as readonly string[]).includes(subtype));
}

function takesCreditFields(type: string | undefined): boolean {
  return Boolean(type && (CREDIT_FIELD_ACCOUNT_TYPES as readonly string[]).includes(type));
}

/**
 * A subtype, credit limit or 0% end date is only accepted on the account types it applies to:
 * a value sent for any other type is refused with 400 rather than stored and ignored. Null (not
 * set) is accepted on every type.
 */
function assertTypeScopedFields(type: string | undefined, fields: Partial<Account>): void {
  const subtype = fields.accountSubtype;
  if (typeof subtype === "string" && !subtypeAppliesTo(type, subtype)) {
    throw new BadRequestException(`accountSubtype ${subtype} does not apply to a ${type} account`);
  }
  if (!takesCreditFields(type)) {
    if (fields.creditLimit !== undefined && fields.creditLimit !== null) {
      throw new BadRequestException(
        "creditLimit applies to Credit Card and Overdraft accounts only",
      );
    }
    if (fields.promoZeroPercentUntil !== undefined && fields.promoZeroPercentUntil !== null) {
      throw new BadRequestException(
        "promoZeroPercentUntil applies to Credit Card and Overdraft accounts only",
      );
    }
  }
}

function validateCreditLimit(value: unknown): number | null | undefined {
  if (value === undefined || value === null) return value;
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > 9_999_999_999.99
  ) {
    throw new BadRequestException(
      "creditLimit must be a non-negative finite number below 10 billion, or null",
    );
  }
  // The column is numeric(12,2): rounding here keeps a value just under the bound from rounding
  // up past it in Postgres.
  return Math.round(value * 100) / 100;
}

/**
 * `accounts.type` is a varchar, so the database accepts any string. The contract checks it too,
 * but the contract can be switched to shadow or off, so the service re-checks it here.
 */
function validateAccountType(value: unknown): AccountType | undefined {
  if (value === undefined) return undefined;
  if (typeof value === "string" && (ACCOUNT_TYPES as readonly string[]).includes(value)) {
    return value as AccountType;
  }
  throw new BadRequestException(`type must be one of ${ACCOUNT_TYPES.join(", ")}`);
}

const nullableNumber = (value: number | string | null | undefined): number | null =>
  value === null || value === undefined ? null : Number(value);

/**
 * The one wire shape of an account (E21 `AccountDto`): every key present, decimals as numbers,
 * `isCurrent` a boolean. Create, update, check-in and the reads all return it, so a client sees
 * the same object whichever route produced it.
 */
function toAccountResponse(account: Account): Account {
  return {
    id: account.id,
    userId: account.userId,
    name: account.name,
    type: account.type,
    accountSubtype: account.accountSubtype ?? null,
    balance: Number(account.balance),
    interestRate: nullableNumber(account.interestRate),
    monthlyContribution: nullableNumber(account.monthlyContribution),
    creditLimit: nullableNumber(account.creditLimit),
    promoZeroPercentUntil: account.promoZeroPercentUntil ?? null,
    termMonths: account.termMonths ?? null,
    fixedRateEndDate: account.fixedRateEndDate ?? null,
    isCurrent: account.isCurrent !== false,
    currency: account.currency,
    studentLoanPlan: account.studentLoanPlan ?? null,
    ownership: account.ownership === "joint" ? "joint" : "sole",
    sharePercent: nullableNumber(account.sharePercent),
    connectionId: account.connectionId ?? null,
    externalAccountId: account.externalAccountId ?? null,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
  };
}

/** An account as the API returns it (BE-09, audit L3): without the owner or provider ids. */
export type PublicAccount<T extends Account = Account> = Omit<T, "userId" | "externalAccountId">;

export function toPublicAccount<T extends Account>(account: T): PublicAccount<T> {
  const { userId: _userId, externalAccountId: _externalAccountId, ...rest } = account;
  return rest;
}

/** GET /accounts order: oldest first, id as tiebreak (keyset pagination). */
const ACCOUNT_ORDER: KeysetOrder = {
  keys: [
    { column: '"a"."created_at"', kind: "timestamp" },
    { column: '"a"."id"', kind: "uuid" },
  ],
  direction: "ASC",
};

/** GET /account-details order: by month, id as tiebreak (keyset pagination). */
const DETAIL_ORDER: KeysetOrder = {
  keys: [
    { column: '"d"."year"', kind: "int" },
    { column: '"d"."month"', kind: "int" },
    { column: '"d"."id"', kind: "int" },
  ],
  direction: "ASC",
};

function validateStudentLoanPlan(value: unknown): string | null | undefined {
  if (value === undefined || value === null) return value;
  if (typeof value === "string" && (STUDENT_LOAN_PLANS as readonly string[]).includes(value)) {
    return value;
  }
  throw new BadRequestException(
    `studentLoanPlan must be one of ${STUDENT_LOAN_PLANS.join(", ")}, or null`,
  );
}

const ACCOUNT_OWNERSHIPS = ["sole", "joint"] as const;

function validateOwnership(value: unknown): AccountOwnership | undefined {
  if (value === undefined) return undefined;
  if (typeof value === "string" && (ACCOUNT_OWNERSHIPS as readonly string[]).includes(value)) {
    return value as AccountOwnership;
  }
  throw new BadRequestException(`ownership must be one of ${ACCOUNT_OWNERSHIPS.join(", ")}`);
}

function validateSharePercent(value: unknown): number | null | undefined {
  if (value === undefined || value === null) return value;
  if (typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 100) {
    return value;
  }
  throw new BadRequestException("sharePercent must be an integer between 1 and 100, or null");
}

const MAX_BALANCE_BATCH = 100;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface BalanceUpdateDto {
  id: string;
  balance: number;
}

export interface UpdateBalancesDto {
  balances: BalanceUpdateDto[];
}

/** A balance must be a finite number below 10 billion in magnitude (numeric(12,2) column). */
function validateBalance(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value) || Math.abs(value) >= 1e10) {
    throw new BadRequestException("balance must be a finite number below 10 billion");
  }
  return value;
}

/** Validates the PATCH /accounts/balances body; throws 400 on anything malformed. */
function validateBalanceUpdates(body: unknown): BalanceUpdateDto[] {
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
    if (typeof balance !== "number") {
      throw new BadRequestException("each balance must be a finite number below 10 billion");
    }
    validateBalance(balance);
    const key = id.toLowerCase();
    if (seen.has(key)) {
      throw new BadRequestException("each account may appear once in balances");
    }
    seen.add(key);
    return { id: key, balance };
  });
}

export interface DeleteAccountResponse {
  success: boolean;
}

interface AccountDeleteRepositories {
  accounts: Repository<Account>;
  details: Repository<AccountDetail>;
  /** Absent only for test doubles without a manager; the foreign key cascades in a database. */
  transactions?: Repository<Transaction>;
}

async function deleteOwnedAccount(
  repos: AccountDeleteRepositories,
  userId: string,
  id: string,
): Promise<DeleteAccountResponse> {
  const account = await repos.accounts.findOne({ where: { id, userId } });
  if (!account) {
    throw new NotFoundException("Account not found");
  }
  await repos.transactions?.delete({ accountId: id });
  await repos.details.delete({ accountId: id });
  await repos.accounts.remove(account);
  return { success: true };
}

interface IAccountIntake {
  getAccounts(userId: string): Promise<AccountWithDetails[]>;
  getAccount(userId: string, id: string): Promise<AccountWithDetails>;
  getAccountDetails(userId: string, accountId?: string): Promise<AccountDetail[]>;
  createAccount(userId: string, body: CreateAccountDto): Promise<Account>;
  updateAccount(
    userId: string,
    id: string,
    body: UpdateAccountDto,
    expectedVersion?: Date,
  ): Promise<Account>;
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
    const ownership = validateOwnership(body.ownership);
    const sharePercent = validateSharePercent(body.sharePercent);
    const fields = {
      name: body.name,
      type: validateAccountType(body.type),
      accountSubtype: validateAccountSubtype(body.accountSubtype),
      balance: validateBalance(body.balance),
      currency: body.currency,
      interestRate: body.interestRate,
      monthlyContribution: body.monthlyContribution,
      creditLimit: validateCreditLimit(body.creditLimit),
      promoZeroPercentUntil: validateIsoDate(body.promoZeroPercentUntil, "promoZeroPercentUntil"),
      termMonths: validateTermMonths(body.termMonths),
      fixedRateEndDate: validateIsoDate(body.fixedRateEndDate, "fixedRateEndDate"),
      studentLoanPlan,
      ownership,
      sharePercent,
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
        const list = acc[d.accountId] ?? [];
        list.push(d);
        acc[d.accountId] = list;
        return acc;
      },
      {} as Record<string, AccountDetail[]>,
    );

    return accounts.map((acc) => ({
      ...toAccountResponse(acc),
      details: detailsByAccount[acc.id] || [],
    }));
  }

  /** One page of the user's accounts, each with its monthly history (BE-09, M-API1). */
  async listAccounts(userId: string, page: PageRequest): Promise<Page<AccountWithDetails>> {
    const qb = this.accountRepository
      .createQueryBuilder("a")
      .where("a.userId = :userId", { userId });
    const { items, nextCursor } = await keysetPage(qb, ACCOUNT_ORDER, page);
    const details =
      items.length > 0
        ? await this.accountDetailRepository.find({
            where: { accountId: In(items.map((a) => a.id)) },
            order: { year: "ASC", month: "ASC" },
          })
        : [];
    const byAccount = new Map<string, AccountDetail[]>();
    for (const d of details) byAccount.set(d.accountId, [...(byAccount.get(d.accountId) ?? []), d]);
    return {
      items: items.map((a) => ({ ...toAccountResponse(a), details: byAccount.get(a.id) ?? [] })),
      nextCursor,
    };
  }

  /**
   * One page of monthly values: every account of the user's, or one account's (404 when it is
   * not theirs). The user filter is on the detail row's own user id and, for one account, on the
   * account's owner as well.
   */
  async listAccountDetails(
    userId: string,
    page: PageRequest,
    accountId?: string,
  ): Promise<Page<AccountDetail>> {
    if (accountId) {
      const account = await this.accountRepository.findOne({ where: { id: accountId, userId } });
      if (!account) throw new NotFoundException("Account not found");
    }
    const qb = this.accountDetailRepository
      .createQueryBuilder("d")
      .innerJoin(Account, "owner", '"owner"."id" = "d"."account_id"')
      .where('"owner"."user_id" = :userId', { userId });
    if (accountId) qb.andWhere('"d"."account_id" = :accountId', { accountId });
    return keysetPage(qb, DETAIL_ORDER, page);
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

    return { ...toAccountResponse(account), details };
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
    assertTypeScopedFields(fields.type, fields);
    if (body.connectionId) {
      const connection = await this.bankConnectionRepository.findOne({
        where: { id: body.connectionId, userId },
      });
      if (!connection) {
        throw new NotFoundException("Bank connection not found");
      }
      fields.connectionId = connection.id;
    }
    if (fields.balance !== undefined) {
      // BE-05 (audit H6): creation follows the same sign rule as every other write path.
      fields.balance = storedBalance(fields.type, Number(fields.balance));
    }
    const effectiveOwnership: AccountOwnership = fields.ownership ?? "sole";
    if (
      effectiveOwnership === "joint" &&
      !canAccountBeJoint({
        name: fields.name,
        type: fields.type,
        accountSubtype: fields.accountSubtype,
      })
    ) {
      throw new BadRequestException("ISAs and pensions cannot be held jointly");
    }
    const effectiveSharePercent =
      effectiveOwnership === "joint" ? (fields.sharePercent ?? DEFAULT_JOINT_SHARE_PERCENT) : null;
    const account: Account = this.accountRepository.create({
      ...fields,
      ownership: effectiveOwnership,
      sharePercent: effectiveSharePercent,
      // accounts.currency is NOT NULL and the DTO leaves it optional, so default it here.
      currency: fields.currency || DEFAULT_ACCOUNT_CURRENCY,
      userId,
    });
    return toAccountResponse(await this.accountRepository.save(account));
  }

  /**
   * Runs `work` in one DB transaction with transaction-bound repositories. Test doubles without
   * a TypeORM manager run it directly on the injected repositories.
   */
  private runInTransaction<T>(
    work: (accounts: Repository<Account>, details: Repository<AccountDetail>) => Promise<T>,
  ): Promise<T> {
    const manager = this.accountRepository.manager;
    if (!manager?.transaction) {
      if (process.env.NODE_ENV === "production") {
        throw new Error("Account writes need a TypeORM manager to run transactionally");
      }
      return work(this.accountRepository, this.accountDetailRepository);
    }
    return manager.transaction((em) =>
      work(em.getRepository(Account), em.getRepository(AccountDetail)),
    );
  }

  /** Month-end snapshot for the current UK month: one row per account per month (E23 D22). */
  private upsertCurrentMonthHistory(
    details: Repository<AccountDetail>,
    userId: string,
    accountId: string,
    value: number,
  ): Promise<unknown> {
    // One clock reading for year, month and date, so the row always satisfies the month CHECK.
    const asOfDate = londonDate();
    const [year, month] = asOfDate.split("-").map(Number) as [number, number];
    // A balance edit or check-in is a manual snapshot value (E30): it also sticks against sync.
    // Clearing import_batch_id hands the row back to the user: an import revert no longer owns it.
    return details.upsert(
      { accountId, userId, year, month, value, asOfDate, source: "manual", importBatchId: null },
      ["accountId", "year", "month"],
    );
  }

  /**
   * `expectedVersion` (from If-Match) makes the update conditional: it is claimed atomically
   * first (claimVersion), so a stale version writes nothing and is a 412 (BE-09, M7).
   */
  async updateAccount(
    userId: string,
    id: string,
    body: UpdateAccountDto,
    expectedVersion?: Date,
  ): Promise<Account> {
    return this.runInTransaction(async (accounts, details) => {
      if (expectedVersion) {
        const claim = await claimVersion(accounts, { id, user_id: userId }, expectedVersion);
        if (claim === "missing") throw new NotFoundException("Account not found");
        if (claim === "stale") throw preconditionFailed();
      }
      const account = await accounts.findOne({ where: { id, userId } });
      if (!account) {
        throw new NotFoundException("Account not found");
      }

      const previousType = account.type;
      const picked = this.pickAccountFields(body);
      const nextType = picked.type ?? account.type;
      assertTypeScopedFields(nextType, picked);
      const nextSubtype =
        picked.accountSubtype !== undefined ? picked.accountSubtype : account.accountSubtype;
      // Omitted ownership and share stay as saved. A rename or type change that makes a joint
      // account an ISA or pension is refused unless the same request says sole (E34), so joint
      // ownership is never dropped without the caller asking. Checked before any field changes.
      // Only a PATCH that renames, retypes or asks for joint can trip it: an unrelated edit (a
      // balance, say) to a stored legacy joint ISA goes through and is stored as sole, which is
      // how the engine already counts it.
      const eligible = canAccountBeJoint({
        name: picked.name ?? account.name,
        type: nextType,
        accountSubtype: nextSubtype,
      });
      const nextOwnership = picked.ownership ?? account.ownership;
      const touchesJointRule =
        (picked.name !== undefined && picked.name !== account.name) ||
        (picked.type !== undefined && picked.type !== account.type) ||
        (picked.accountSubtype !== undefined && picked.accountSubtype !== account.accountSubtype) ||
        picked.ownership === "joint";
      if (!eligible && nextOwnership === "joint" && touchesJointRule) {
        throw new BadRequestException(
          "ISAs and pensions cannot be held jointly. Send ownership as sole with this change.",
        );
      }
      Object.assign(account, picked);
      // A saved subtype, limit or 0% date the new type does not take is cleared with the type
      // change, so a stale value never steers the figures (a BTL subtype on a Property, say).
      if (account.accountSubtype && !subtypeAppliesTo(account.type, account.accountSubtype)) {
        account.accountSubtype = null;
      }
      if (!takesCreditFields(account.type)) {
        account.creditLimit = null;
        account.promoZeroPercentUntil = null;
      }
      const effectiveOwnership: AccountOwnership = account.ownership === "joint" ? "joint" : "sole";
      if (!eligible) {
        account.ownership = "sole";
        account.sharePercent = null;
      } else if (effectiveOwnership === "joint") {
        account.ownership = "joint";
        account.sharePercent = account.sharePercent ?? DEFAULT_JOINT_SHARE_PERCENT;
      } else {
        account.ownership = "sole";
        account.sharePercent = null;
      }
      const typeChanged = account.type !== previousType;
      if (body.balance !== undefined && body.balance !== null) {
        // Same sign rule as every other write path (liabilities negative).
        account.balance = storedBalance(account.type, Number(body.balance));
      } else if (typeChanged && Number.isFinite(Number(account.balance))) {
        // A type change alone re-signs the stored balance too (BE-05, audit H6).
        account.balance = storedBalance(account.type, Number(account.balance));
      }
      if (typeChanged) {
        // History first, while the row is still the old type (see resignHistoryForType).
        await resignHistoryForType(details, account.id, account.type);
      }
      const saved = await accounts.save(account);
      if (body.balance !== undefined && body.balance !== null) {
        await this.upsertCurrentMonthHistory(details, userId, account.id, Number(saved.balance));
      }
      // Re-read so the response carries the version the database now holds (the ETag).
      const fresh = await accounts.findOne({ where: { id, userId } });
      return toAccountResponse(fresh ?? saved);
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
        account.balance = storedBalance(account.type, balance);
        const saved = await accounts.save(account);
        await this.upsertCurrentMonthHistory(details, userId, account.id, Number(saved.balance));
        result.push(toAccountResponse(saved));
      }
      return result;
    });
  }

  /**
   * Deletes one of the caller's accounts with its history and transactions, in one transaction
   * (E1 D-06, audit M2). The ownership check runs first, so another user's id deletes nothing and
   * is a 404. The foreign keys cascade (AccountIdForeignKeys1794358200000); the explicit child
   * deletes keep the order plain.
   */
  async deleteAccount(userId: string, id: string): Promise<DeleteAccountResponse> {
    const manager = this.accountRepository.manager;
    if (!manager?.transaction) {
      throw new Error("Account deletes need a TypeORM manager to run transactionally");
    }
    return manager.transaction(async (em) => {
      const result = await deleteOwnedAccount(
        {
          accounts: em.getRepository(Account),
          details: em.getRepository(AccountDetail),
          transactions: em.getRepository(Transaction),
        },
        userId,
        id,
      );
      // BE-06 (H12): recorded in the delete's transaction, so one cannot happen without the other.
      await recordAuditEvent(em, { userId, action: "account.deleted", targetId: id });
      return result;
    });
  }

  /**
   * Two queries (audit M24): the user's accounts, then their history. getAccounts already loads
   * every detail of those accounts, so the snapshot reuses them instead of reading them again.
   */
  async getPortfolioSnapshot(userId: string): Promise<PortfolioSnapshotResponse> {
    const accounts = await this.getAccounts(userId);
    const details = accounts.flatMap((a) => a.details);
    const snapshot = new PortfolioSnapshot(accounts, details);
    // Net worth, totals and history follow the user's own choices of what counts.
    const profile = await this.userProfileRepository.findOne({
      where: { userId },
      select: { id: true, netWorthCountsProperty: true, netWorthCountsStudentLoan: true },
    });
    const basis = netWorthBasisFromProfile(profile);

    return {
      netWorth: snapshot.getTotalNetWorth(basis),
      totalAssets: snapshot.getTotalAssets(basis),
      totalLiabilities: snapshot.getTotalLiabilities(basis),
      totalLiquidCash: snapshot.getTotalLiquidCash(),
      totalInvestments: snapshot.getTotalInvestments(),
      totalPensions: snapshot.getTotalPensions(),
      totalConsumerDebt: snapshot.getTotalConsumerDebt(),
      totalMortgageBalance: snapshot.getTotalMortgageBalance(),
      totalProperty: snapshot.getTotalProperty(),
      totalStudentLoans: snapshot.getTotalStudentLoans(),
      // Each account's netWorthBalance is its contribution under the user's basis (0 when left out).
      resolvedAccounts: snapshot
        .getResolvedAccounts()
        .map((a) => ({ ...a, netWorthBalance: snapshot.netWorthBalanceOf(a, basis) })),
      monthlyHistory: snapshot.getMonthlyHistory(basis),
      netWorthLeavesOut: resolveSnapshotNetWorthScope(snapshot, basis).leftOut,
      currency: accounts[0]?.currency || "GBP",
    };
  }
}
