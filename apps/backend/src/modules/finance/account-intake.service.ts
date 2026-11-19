import {
  ACCOUNT_SUBTYPES,
  ACCOUNT_SUBTYPES_BY_TYPE,
  ACCOUNT_TYPES,
  CREDIT_FIELD_ACCOUNT_TYPES,
  MORTGAGE_REPAYMENT_TYPES,
  type MortgageRepaymentType,
} from "@flump/api-contract";
import {
  type AccountOwnership,
  BUY_TO_LET_PROPERTY_LABEL,
  canAccountBeJoint,
  DEFAULT_JOINT_SHARE_PERCENT,
  HOME_ESTIMATE_LABEL,
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
import { londonDate } from "../snapshots/london-date";
import { debtBecomesAsset, resignHistoryForType, storedBalance } from "../snapshots/stored-balance";
import { writeStudentLoanPlanToProfile } from "./student-loan-plan-profile";

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
  /** Mortgage accounts only: the caller's own Property account the mortgage is on. */
  linkedAccountId?: string | null;
  /** Mortgage accounts only. */
  repaymentType?: MortgageRepaymentType | null;
  isCurrent?: boolean;
  connectionId?: string | null;
  externalAccountId?: string | null;
}

export type UpdateAccountDto = Partial<CreateAccountDto>;

/** POST /accounts/mortgage-with-property (system audit slice 4). */
export interface CreateMortgageWithPropertyDto {
  mortgage: Omit<
    CreateAccountDto,
    "type" | "linkedAccountId" | "connectionId" | "externalAccountId"
  >;
  property: {
    name?: string;
    balance: number;
    ownership?: AccountOwnership;
    sharePercent?: number | null;
  };
}

export interface MortgageWithProperty {
  mortgage: Account;
  property: Account;
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

/** The link to a property and the repayment type apply to Mortgage accounts only. */
function takesMortgageFields(type: string | undefined): boolean {
  return type === "Mortgage";
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
  if (!takesMortgageFields(type)) {
    if (fields.linkedAccountId !== undefined && fields.linkedAccountId !== null) {
      throw new BadRequestException("linkedAccountId applies to Mortgage accounts only");
    }
    if (fields.repaymentType !== undefined && fields.repaymentType !== null) {
      throw new BadRequestException("repaymentType applies to Mortgage accounts only");
    }
  }
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateLinkedAccountId(value: unknown): string | null | undefined {
  if (value === undefined || value === null) return value;
  if (typeof value === "string" && UUID_PATTERN.test(value)) return value.toLowerCase();
  throw new BadRequestException("linkedAccountId must be an account id, or null");
}

function validateRepaymentType(value: unknown): MortgageRepaymentType | null | undefined {
  if (value === undefined || value === null) return value;
  if (
    typeof value === "string" &&
    (MORTGAGE_REPAYMENT_TYPES as readonly string[]).includes(value)
  ) {
    return value as MortgageRepaymentType;
  }
  throw new BadRequestException(
    `repaymentType must be one of ${MORTGAGE_REPAYMENT_TYPES.join(", ")}, or null`,
  );
}

/**
 * A mortgage may only be linked to one of the caller's own Property accounts, and never to
 * itself. Checked inside the write's transaction; another user's id is the same 400 as an unknown
 * one, so it reveals nothing.
 */
async function assertLinkTarget(
  accounts: Repository<Account>,
  userId: string,
  linkedAccountId: string | null | undefined,
  selfId?: string,
): Promise<void> {
  if (linkedAccountId === undefined || linkedAccountId === null) return;
  const target =
    linkedAccountId === selfId
      ? null
      : // FOR SHARE: a concurrent type change of the target waits for this write, so a mortgage
        // is never left linked to an account that stopped being a property meanwhile.
        await accounts.findOne({
          where: { id: linkedAccountId, userId },
          lock: { mode: "pessimistic_read" },
        });
  if (!target || target.type !== "Property") {
    throw new BadRequestException("linkedAccountId must be one of your Property accounts");
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
    linkedAccountId: account.linkedAccountId ?? null,
    repaymentType: account.repaymentType ?? null,
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

/** A balance must be a finite number below 10 billion in magnitude (numeric(12,2) column). */
function validateBalance(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value) || Math.abs(value) >= 1e10) {
    throw new BadRequestException("balance must be a finite number below 10 billion");
  }
  return value;
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

/**
 * Allow-list of client-writable account fields. `id`, `userId` and
 * `connectionId` are never copied from a request body.
 */
function pickAccountFields(
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
    linkedAccountId: validateLinkedAccountId(body.linkedAccountId),
    repaymentType: validateRepaymentType(body.repaymentType),
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

/**
 * The fields a new account is stored with, before its owner and any bank connection are added:
 * the form's field checks, the sign rule (BE-05, audit H6), the joint check, the ownership and
 * share defaults and the currency default. `createAccount` and the import commit (AI-9) both
 * build new accounts here, so the two create paths follow the same rules.
 */
export function newAccountFields(body: CreateAccountDto): Partial<Account> {
  const fields = pickAccountFields(body, true);
  assertTypeScopedFields(fields.type, fields);
  if (fields.balance !== undefined) {
    fields.balance = storedBalance(fields.type, Number(fields.balance));
  }
  const ownership: AccountOwnership = fields.ownership ?? "sole";
  if (
    ownership === "joint" &&
    !canAccountBeJoint({
      name: fields.name,
      type: fields.type,
      accountSubtype: fields.accountSubtype,
    })
  ) {
    throw new BadRequestException("ISAs and pensions cannot be held jointly");
  }
  return {
    ...fields,
    ownership,
    sharePercent:
      ownership === "joint" ? (fields.sharePercent ?? DEFAULT_JOINT_SHARE_PERCENT) : null,
    // accounts.currency is NOT NULL and the DTO leaves it optional, so default it here.
    currency: fields.currency || DEFAULT_ACCOUNT_CURRENCY,
  };
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
  createMortgageWithProperty(
    userId: string,
    body: CreateMortgageWithPropertyDto,
  ): Promise<MortgageWithProperty>;
  deleteAccount(userId: string, id: string): Promise<DeleteAccountResponse>;
}

@Injectable()
export class AccountIntakeService implements IAccountIntake {
  constructor(
    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,
    @InjectRepository(AccountDetail)
    private readonly accountDetailRepository: Repository<AccountDetail>,
    @InjectRepository(BankConnection)
    private readonly bankConnectionRepository: Repository<BankConnection>,
  ) {}

  private pickAccountFields(
    body: CreateAccountDto | UpdateAccountDto,
    isCreate = false,
  ): Partial<Account> {
    return pickAccountFields(body, isCreate);
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
    // The field checks, sign rule (BE-05, audit H6) and defaults, shared with the import commit.
    const fields = newAccountFields(body);
    if (body.connectionId) {
      const connection = await this.bankConnectionRepository.findOne({
        where: { id: body.connectionId, userId },
      });
      if (!connection) {
        throw new NotFoundException("Bank connection not found");
      }
      fields.connectionId = connection.id;
    }
    const account: Account = this.accountRepository.create({ ...fields, userId });
    return this.runInTransaction(async (accounts, details) => {
      await assertLinkTarget(accounts, userId, account.linkedAccountId);
      const saved = await accounts.save(account);
      await this.writeFirstHistoryRow(details, userId, saved);
      await this.writePlanToProfile(accounts, userId, saved);
      return toAccountResponse(saved);
    });
  }

  /**
   * A mortgage and the property it is on, created and linked in one transaction (system audit
   * slice 4, replacing the browser's two calls from PR 779): a failure anywhere leaves neither.
   * The property's kind follows the mortgage's (a buy-to-let mortgage is on a rental, any other on
   * the home). It takes the mortgage's ownership and share unless the request gives its own
   * (decision 14 option B: a suggestion when the pair is first set up; either may differ after).
   * Each account gets its first history row.
   */
  async createMortgageWithProperty(
    userId: string,
    body: CreateMortgageWithPropertyDto,
  ): Promise<MortgageWithProperty> {
    const mortgageBody = (body?.mortgage ?? {}) as CreateMortgageWithPropertyDto["mortgage"];
    const propertyBody = body?.property;
    if (!propertyBody || typeof propertyBody !== "object") {
      throw new BadRequestException("property is required");
    }
    const mortgageFields = newAccountFields({ ...mortgageBody, type: "Mortgage" });
    // Linking is what this call does, so a link or bank ids in the body are never taken.
    delete mortgageFields.linkedAccountId;
    delete mortgageFields.externalAccountId;
    const value = validateBalance(propertyBody.balance);
    if (value === undefined || !(value > 0)) {
      throw new BadRequestException("property.balance must be a number above 0");
    }
    const rental = mortgageFields.accountSubtype === "btl_mortgage";
    const followsMortgage = propertyBody.ownership === undefined;
    const propertyFields = newAccountFields({
      name: propertyBody.name || (rental ? BUY_TO_LET_PROPERTY_LABEL : HOME_ESTIMATE_LABEL),
      type: "Property",
      accountSubtype: rental ? "rental" : "home",
      balance: value,
      ownership: followsMortgage ? mortgageFields.ownership : propertyBody.ownership,
      sharePercent: followsMortgage ? mortgageFields.sharePercent : propertyBody.sharePercent,
    });
    return this.runInTransaction(async (accounts, details) => {
      const property = await accounts.save(accounts.create({ ...propertyFields, userId }));
      const mortgage = await accounts.save(
        accounts.create({ ...mortgageFields, linkedAccountId: property.id, userId }),
      );
      await this.writeFirstHistoryRow(details, userId, property);
      await this.writeFirstHistoryRow(details, userId, mortgage);
      return { mortgage: toAccountResponse(mortgage), property: toAccountResponse(property) };
    });
  }

  /**
   * Decision 8 option A (CH-1, L05): a new account's balance is recorded as this month's history
   * at once, so History has a point for the month it was added and today's balance equals the
   * newest record. A bank-connected account is left to the sync, which writes its own rows.
   */
  private async writeFirstHistoryRow(
    details: Repository<AccountDetail>,
    userId: string,
    account: Account,
  ): Promise<void> {
    if (account.connectionId) return;
    // Source `backfill`: the balance the account was added with, not a check-in answer, so the
    // monthly check-in still asks for it this month (CH-3; slice 2's rule, L70).
    await this.upsertCurrentMonthHistory(
      details,
      userId,
      account.id,
      Number(account.balance),
      "backfill",
    );
  }

  /**
   * Slice 6 (PP-7, L30): a Student Loan account's plan goes to the profile, the one home for it,
   * when the profile has none. Runs on the write's own transaction manager. Test doubles without
   * a TypeORM manager skip it (the rule itself is unit-tested in student-loan-plan-profile.spec).
   */
  private async writePlanToProfile(
    accounts: Repository<Account>,
    userId: string,
    account: Account,
  ): Promise<void> {
    if (!accounts.manager?.getRepository) return;
    await writeStudentLoanPlanToProfile(accounts.manager, userId, account);
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
    source: "manual" | "backfill" = "manual",
  ): Promise<unknown> {
    // One clock reading for year, month and date, so the row always satisfies the month CHECK.
    const asOfDate = londonDate();
    const [year, month] = asOfDate.split("-").map(Number) as [number, number];
    // A balance edit or check-in is a manual snapshot value (E30): it also sticks against sync.
    // Clearing import_batch_id hands the row back to the user: an import revert no longer owns it.
    return details.upsert(
      { accountId, userId, year, month, value, asOfDate, source, importBatchId: null },
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
      const requestedSubtype =
        picked.accountSubtype !== undefined ? picked.accountSubtype : account.accountSubtype;
      // The subtype the account keeps after this change: a saved one the new type does not take
      // is cleared below, so the joint check must not lean on it (the engine never would).
      const nextSubtype =
        requestedSubtype && subtypeAppliesTo(nextType, requestedSubtype) ? requestedSubtype : null;
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
      if (!takesMortgageFields(account.type)) {
        account.linkedAccountId = null;
        account.repaymentType = null;
      } else if (picked.linkedAccountId !== undefined) {
        await assertLinkTarget(accounts, userId, picked.linkedAccountId, account.id);
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
        // A type change alone re-signs the stored balance too (BE-05, audit H6). A debt that
        // becomes an asset that cannot be overdrawn turns positive, as its history does; one that
        // becomes a current account stays overdrawn (CH-4, typeChangeFlipsSign).
        const current = Number(account.balance);
        account.balance = debtBecomesAsset(previousType, account.type)
          ? Math.abs(current)
          : storedBalance(account.type, current);
      }
      if (typeChanged) {
        // History first, while the row is still the old type (see resignHistoryForType).
        await resignHistoryForType(details, account.id, account.type, previousType);
      }
      if (typeChanged && previousType === "Property") {
        // No longer a property, so no mortgage can stay linked to it.
        await accounts.update({ linkedAccountId: account.id, userId }, { linkedAccountId: null });
      }
      const saved = await accounts.save(account);
      await this.writePlanToProfile(accounts, userId, saved);
      if (body.balance !== undefined && body.balance !== null) {
        await this.upsertCurrentMonthHistory(details, userId, account.id, Number(saved.balance));
      }
      // Decision 14 option B: a property and its mortgage may hold different shares, so a share
      // change here never moves the linked account.
      // Re-read so the response carries the version the database now holds (the ETag).
      const fresh = await accounts.findOne({ where: { id, userId } });
      return toAccountResponse(fresh ?? saved);
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
}
