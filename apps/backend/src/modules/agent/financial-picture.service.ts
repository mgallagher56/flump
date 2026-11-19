import {
  type TaxRecord as EngineTaxRecord,
  type LoadedFinancialPicture,
  loadFinancialPicture,
  type PictureRowSource,
  type RawAccount,
  type RawAccountDetail,
  type UserProfileData,
} from "@flump/finance-engine";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type { FindOptionsSelect, Repository } from "typeorm";
import { BudgetEntry } from "../../entities/budget-entry.entity";
import { TaxRecord } from "../../entities/tax-record.entity";
import { FinanceService } from "../finance/finance.service";
import { type ProfileView, UserProfileService } from "../profile/user-profile.service";

/** The profile as the engine reads it: the wire shape, dates as ISO strings. */
const isoOf = (value: unknown): string | undefined =>
  value instanceof Date ? value.toISOString() : typeof value === "string" ? value : undefined;
export const wireProfile = (profile: ProfileView) => ({
  ...profile,
  createdAt: isoOf(profile.createdAt),
  updatedAt: isoOf(profile.updatedAt),
});

/**
 * Tax-record columns the picture reads, selected explicitly. No `receipt*` column is ever read,
 * so a receipt blob or filename cannot reach the picture or the MCP output (E20-N15, E17-N7).
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

/**
 * The one server-side financial picture assembler (owner decision 10, option B). It lives in the
 * agent module for now because that module already depends on finance and profile; moving it
 * to a module of its own is a module-graph change for phase B, when the web reads it too.
 *
 * Builds one user's financial picture from their saved rows. Callers pass the user id, never the
 * rows: every query below filters by that id in SQL, so a picture can only hold one user's data.
 */
@Injectable()
export class FinancialPictureService {
  constructor(
    @InjectRepository(BudgetEntry)
    private readonly budgetEntryRepository: Repository<BudgetEntry>,
    @InjectRepository(TaxRecord)
    private readonly taxRecordRepository: Repository<TaxRecord>,
    private readonly financeService: FinanceService,
    private readonly userProfileService: UserProfileService,
  ) {}

  /** The row source for one user. Every method reads that user's rows only. */
  sourceFor(userId: string): PictureRowSource<BudgetEntry> {
    return {
      profile: async () =>
        wireProfile(await this.userProfileService.getProfile(userId)) as Partial<UserProfileData>,
      accounts: async () => (await this.financeService.getAccounts(userId)) as RawAccount[],
      accountDetails: async () =>
        (await this.financeService.getAccountDetails(userId)) as unknown as RawAccountDetail[],
      // Whole entities: the context pack keeps `notes`, which the picture itself never reads.
      budgetEntries: () =>
        this.budgetEntryRepository.find({ where: { userId }, order: { createdAt: "ASC" } }),
      taxRecords: async () =>
        (await this.taxRecordRepository.find({
          where: { userId },
          select: TAX_RECORD_COLUMNS,
          order: { date: "DESC" },
        })) as unknown as EngineTaxRecord[],
    };
  }

  /** Loads the user's rows and builds the picture as of `asOf` (now when not given). */
  load(userId: string, opts: { asOf?: Date } = {}): Promise<LoadedFinancialPicture<BudgetEntry>> {
    return loadFinancialPicture(this.sourceFor(userId), { asOf: opts.asOf ?? new Date() });
  }
}
