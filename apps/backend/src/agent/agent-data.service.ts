import {
  type BuildContextPackInput,
  budgetEntryFromRow,
  profileFactsFromProfile,
  userProfileToFinancialBaseline,
} from "@flump/finance-engine";
import type { McpUserDataProvider } from "@flump/mcp";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
  Between,
  type FindOptionsSelect,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from "typeorm";
import { BudgetEntry } from "../entities/budget-entry.entity";
import { TaxRecord } from "../entities/tax-record.entity";
import { Transaction } from "../entities/transaction.entity";
import { FinanceService } from "../finance.service";
import { UserProfileService } from "../user-profile.service";

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
  ) {}

  async getUserFinancialData(
    userId: string,
    options: { anonymizeInstitutions?: boolean } = {},
  ): Promise<BuildContextPackInput> {
    const profile = await this.userProfileService.getProfile(userId);
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
