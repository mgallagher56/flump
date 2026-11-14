import {
  type BuildContextPackInput,
  budgetEntryFromRow,
  type FinancialBaseline,
  type NetWorthBasis,
  netWorthBasisFromProfile,
  profileFactsFromProfile,
  type RawAccount,
  userProfileToFinancialBaseline,
} from "@flump/finance-engine";
import {
  type AccountCoverage,
  type AccountSnapshotRow,
  type McpTaxRecord,
  type McpUserDataProvider,
  type MonthRange,
  monthLabel,
  parseMonth,
} from "@flump/mcp";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
  Between,
  Brackets,
  type FindOptionsSelect,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from "typeorm";
import { Account } from "../entities/account.entity";
import { AccountDetail } from "../entities/account-detail.entity";
import { BudgetEntry } from "../entities/budget-entry.entity";
import { TaxRecord } from "../entities/tax-record.entity";
import { Transaction } from "../entities/transaction.entity";
import { FinanceService } from "../finance.service";
import { type ProfileView, UserProfileService } from "../user-profile.service";

/** The profile as the engine reads it: the wire shape, dates as ISO strings. */
const isoOf = (value: unknown): string | undefined =>
  value instanceof Date ? value.toISOString() : typeof value === "string" ? value : undefined;
const wireProfile = (profile: ProfileView) => ({
  ...profile,
  createdAt: isoOf(profile.createdAt),
  updatedAt: isoOf(profile.updatedAt),
});

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Tax-record columns sent to MCP clients, selected explicitly. No `receipt*` column is ever
 * read, so a receipt blob or filename cannot reach the provider output (E20-N15, E17-N7).
 */
const TAX_RECORD_COLUMNS = {
  id: true,
  type: true,
  source: true,
  category: true,
  name: true,
  amount: true,
  frequency: true,
  date: true,
  endDate: true,
  notes: true,
} as const satisfies FindOptionsSelect<TaxRecord>;

/** Account columns the MCP query tools need. No connection or external ids. */
const ACCOUNT_COLUMNS = {
  id: true,
  name: true,
  type: true,
  balance: true,
  interestRate: true,
  monthlyContribution: true,
  termMonths: true,
  fixedRateEndDate: true,
  currency: true,
  isCurrent: true,
  createdAt: true,
} as const satisfies FindOptionsSelect<Account>;

/** TAX_RECORD_COLUMNS minus notes, for the query builder. Never a receipt column. */
const MCP_TAX_RECORD_SELECT = [
  "t.id",
  "t.type",
  "t.source",
  "t.category",
  "t.name",
  "t.amount",
  "t.frequency",
  "t.date",
  "t.endDate",
];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
/** Gap runs returned per account; the tool lists fewer and flags truncation. */
const MAX_GAP_ROWS = 50;

interface RawSnapshotRow {
  accountId: string;
  year: number | string;
  month: number | string;
  value: number | string;
  source: string;
}

interface RawCoverageRow {
  accountId: string;
  first: number | string;
  last: number | string;
  recorded: number | string;
  sources: string[] | string;
}

interface RawGapRow {
  accountId: string;
  from: number | string;
  to: number | string;
}

/** node-postgres returns varchar[] as an array; accept the "{a,b}" text form too. */
function parsePgArray(value: string[] | string | null | undefined): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value !== "string") return [];
  return value
    .replace(/^\{|\}$/g, "")
    .split(",")
    .map((v) => v.replace(/^"|"$/g, ""))
    .filter((v) => v.length > 0);
}

/**
 * Rows of the caller's own accounts only: filtered on `account_details.user_id` and joined to
 * `accounts` on (id, user_id), so a row of a deleted or foreign account never comes back.
 * `$1` is the user id; `extra` is appended to the WHERE clause. The planner drives from
 * `account_details` through IDX_account_details_user_account_year_month (user_id first, then each
 * account's months in order) and hash-joins the user's accounts (both ids are uuid since
 * AccountIdForeignKeys1794358200000).
 */
const ownedDetails = (extra = "") => `FROM "account_details" d
  JOIN "accounts" a ON a."id" = d."account_id" AND a."user_id" = $1
  WHERE d."user_id" = $1${extra}`;

const MONTH_INDEX = `(d."year" * 12 + d."month" - 1)`;

/** Read-only user data for the MCP handler and the context pack. */
@Injectable()
export class AgentDataService implements McpUserDataProvider {
  constructor(
    @InjectRepository(BudgetEntry)
    private readonly budgetEntryRepository: Repository<BudgetEntry>,
    @InjectRepository(TaxRecord)
    private readonly taxRecordRepository: Repository<TaxRecord>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    private readonly financeService: FinanceService,
    private readonly userProfileService: UserProfileService,
    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,
    @InjectRepository(AccountDetail)
    private readonly accountDetailRepository: Repository<AccountDetail>,
  ) {}

  // --- Ranged reads for the MCP query tools (E17 re-plan PR B) ---------------------------------
  // Each one filters by the caller's user id in SQL; none loads the whole history to filter here.

  async getAccounts(userId: string): Promise<RawAccount[]> {
    const accounts = await this.accountRepository.find({
      where: { userId },
      select: ACCOUNT_COLUMNS,
      order: { createdAt: "ASC" },
    });
    return accounts.map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      balance: Number(a.balance),
      interestRate: a.interestRate == null ? null : Number(a.interestRate),
      monthlyContribution: a.monthlyContribution == null ? null : Number(a.monthlyContribution),
      termMonths: a.termMonths,
      fixedRateEndDate: a.fixedRateEndDate,
      currency: a.currency,
      isCurrent: a.isCurrent !== false,
    }));
  }

  async getBaseline(userId: string): Promise<FinancialBaseline> {
    const profile = wireProfile(await this.userProfileService.getProfile(userId));
    return userProfileToFinancialBaseline(profile, userId);
  }

  async getNetWorthBasis(userId: string): Promise<NetWorthBasis> {
    return netWorthBasisFromProfile(await this.userProfileService.getProfile(userId));
  }

  async getAccountSnapshots(
    userId: string,
    range: MonthRange & { accountIds?: readonly string[] },
  ): Promise<AccountSnapshotRow[]> {
    const from = parseMonth(range.from);
    const to = parseMonth(range.to);
    if (from === null || to === null || from > to) return [];
    if (range.accountIds && range.accountIds.length === 0) return [];
    const params: unknown[] = [userId, from, to];
    let accounts = "";
    if (range.accountIds) {
      const ids = [...new Set(range.accountIds.filter((id) => UUID_PATTERN.test(id)))].map((id) =>
        id.toLowerCase(),
      );
      if (ids.length === 0) return [];
      params.push(ids);
      accounts = ' AND d."account_id" = ANY($4::uuid[])';
    }
    const columns = `d."account_id" AS "accountId", d."year", d."month", d."value", d."source"`;
    // In-range rows, plus each account's latest row before the range (the carry-forward seed).
    const rows: RawSnapshotRow[] = await this.accountDetailRepository.query(
      `SELECT ${columns} ${ownedDetails(`${accounts} AND ${MONTH_INDEX} BETWEEN $2 AND $3`)}
       UNION ALL
       SELECT * FROM (
         SELECT DISTINCT ON (d."account_id") ${columns}
           ${ownedDetails(`${accounts} AND ${MONTH_INDEX} < $2`)}
          ORDER BY d."account_id", d."year" DESC, d."month" DESC
       ) seeds`,
      params,
    );
    return rows.map((r) => ({
      accountId: String(r.accountId),
      year: Number(r.year),
      month: Number(r.month),
      value: Number(r.value),
      source: String(r.source),
    }));
  }

  async getDataCoverage(userId: string): Promise<AccountCoverage[]> {
    const owned = `SELECT d."account_id", ${MONTH_INDEX} AS idx, d."source" ${ownedDetails()}`;
    const summary: RawCoverageRow[] = await this.accountDetailRepository.query(
      `SELECT r."account_id" AS "accountId", MIN(r.idx)::int AS "first", MAX(r.idx)::int AS "last",
              COUNT(*)::int AS "recorded", array_agg(DISTINCT r."source") AS "sources"
         FROM (${owned}) r
        GROUP BY r."account_id"`,
      [userId],
    );
    const gaps: RawGapRow[] = await this.accountDetailRepository.query(
      `SELECT g."account_id" AS "accountId", g."prev" + 1 AS "from", g.idx - 1 AS "to"
         FROM (
           SELECT t.*, ROW_NUMBER() OVER (PARTITION BY t."account_id" ORDER BY t.idx) AS rn
             FROM (
               SELECT r."account_id", r.idx,
                      LAG(r.idx) OVER (PARTITION BY r."account_id" ORDER BY r.idx) AS "prev"
                 FROM (${owned}) r
             ) t
            WHERE t.idx - t."prev" > 1
         ) g
        WHERE g.rn <= ${MAX_GAP_ROWS}
        ORDER BY g."account_id", g.idx`,
      [userId],
    );
    const gapsByAccount = new Map<string, MonthRange[]>();
    for (const g of gaps) {
      const list = gapsByAccount.get(String(g.accountId)) ?? [];
      list.push({ from: monthLabel(Number(g.from)), to: monthLabel(Number(g.to)) });
      gapsByAccount.set(String(g.accountId), list);
    }
    return summary.map((s) => ({
      accountId: String(s.accountId),
      firstMonth: monthLabel(Number(s.first)),
      lastMonth: monthLabel(Number(s.last)),
      recordedMonths: Number(s.recorded),
      gaps: gapsByAccount.get(String(s.accountId)) ?? [],
      sources: parsePgArray(s.sources).sort(),
    }));
  }

  async getTaxRecords(
    userId: string,
    range: { fromDate: string; toDate: string },
  ): Promise<McpTaxRecord[]> {
    if (!ISO_DATE.test(range.fromDate) || !ISO_DATE.test(range.toDate)) return [];
    const rows = await this.taxRecordRepository
      .createQueryBuilder("t")
      .select(MCP_TAX_RECORD_SELECT)
      .where("t.user_id = :userId", { userId })
      .andWhere("t.date <= :toDate", { toDate: range.toDate })
      .andWhere(
        new Brackets((qb) =>
          qb
            .where("t.frequency = 'monthly' AND (t.end_date IS NULL OR t.end_date >= :fromDate)", {
              fromDate: range.fromDate,
            })
            .orWhere("t.frequency <> 'monthly' AND t.date >= :fromDate", {
              fromDate: range.fromDate,
            }),
        ),
      )
      .orderBy("t.date", "ASC")
      .getMany();
    // Notes are free text that no query tool needs, so they are not sent.
    return rows.map((t) => ({
      id: t.id,
      type: t.type,
      source: t.source,
      category: t.category,
      name: t.name,
      amount: Number(t.amount),
      frequency: t.frequency,
      date: t.date,
      endDate: t.endDate,
    }));
  }

  async getUserFinancialData(
    userId: string,
    options: { anonymizeInstitutions?: boolean } = {},
  ): Promise<BuildContextPackInput> {
    const profile = wireProfile(await this.userProfileService.getProfile(userId));
    const baseline = userProfileToFinancialBaseline(profile, userId);

    const accounts = await this.financeService.getAccounts(userId);
    const accountDetails = await this.financeService.getAccountDetails(userId);

    const budgetEntries = await this.budgetEntryRepository.find({
      where: { userId },
      order: { createdAt: "ASC" },
    });

    const taxRecords = await this.taxRecordRepository.find({
      where: { userId },
      select: TAX_RECORD_COLUMNS,
      order: { date: "DESC" },
    });

    return {
      baseline,
      // Saved facts without defaults: safe to spend needs real take-home, not the baseline's.
      profileFacts: profileFactsFromProfile(profile),
      netWorthBasis: netWorthBasisFromProfile(profile),
      accounts,
      accountDetails,
      // The engine's one row mapper, as the web loaders use; notes stay for non-anonymised packs.
      budgetEntries: budgetEntries.map((b, i) => ({ ...budgetEntryFromRow(b, i), notes: b.notes })),
      // Receipts (base64 blobs) are never sent to MCP clients (E20-N15/N16).
      taxRecords: taxRecords.map((t) => ({
        id: t.id,
        type: t.type,
        source: t.source,
        category: t.category,
        name: t.name,
        amount: t.amount,
        frequency: t.frequency,
        date: t.date,
        endDate: t.endDate,
        notes: t.notes,
      })) as any,
    };
  }

  async queryTransactions(
    userId: string,
    filters: {
      accountId?: string;
      category?: string;
      startDate?: string;
      endDate?: string;
      limit?: number;
    },
  ) {
    const where: any = { userId };
    if (filters.accountId) where.accountId = filters.accountId;
    if (filters.category) where.category = filters.category;

    if (filters.startDate && filters.endDate) {
      where.timestamp = Between(new Date(filters.startDate), new Date(filters.endDate));
    } else if (filters.startDate) {
      where.timestamp = MoreThanOrEqual(new Date(filters.startDate));
    } else if (filters.endDate) {
      where.timestamp = LessThanOrEqual(new Date(filters.endDate));
    }

    const txs = await this.transactionRepository.find({
      where,
      order: { timestamp: "DESC" },
      take: filters.limit || 30,
    });

    return txs.map((tx) => ({
      id: tx.id,
      accountId: tx.accountId,
      amount: Number(tx.amount) || 0,
      description: tx.description,
      category: tx.category,
      timestamp: tx.timestamp.toISOString(),
    }));
  }
}
