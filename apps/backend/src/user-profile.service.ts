import {
  BadRequestException,
  Inject,
  Injectable,
  Optional,
  ServiceUnavailableException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, In, Repository } from "typeorm";
import { Account } from "./entities/account.entity";
import { AccountDetail } from "./entities/account-detail.entity";
import { BankConnection } from "./entities/bank-connection.entity";
import { BudgetEntry } from "./entities/budget-entry.entity";
import { TaxRecord } from "./entities/tax-record.entity";
import { Transaction } from "./entities/transaction.entity";
import { UserProfile } from "./entities/user-profile.entity";
import { USER_IDENTITY_ADAPTER, type UserIdentityAdapter } from "./identity/identity.adapter";
import { safeErrorSummary } from "./log-safe";

const PG_UNIQUE_VIOLATION = "23505";

/** TypeORM wraps the pg error: QueryFailedError.driverError.code. Also accept a bare err.code. */
function isUniqueViolation(err: unknown): boolean {
  const e = err as { code?: unknown; driverError?: { code?: unknown } } | null | undefined;
  return e?.code === PG_UNIQUE_VIOLATION || e?.driverError?.code === PG_UNIQUE_VIOLATION;
}

/**
 * Module keys retired from the product. `forecast` was a dashboard module until the growth
 * forecaster became a tab in Savings. Stored rows may still carry it; it is filtered out on read
 * (non-destructive: the row is rewritten the next time the user saves).
 */
const RETIRED_MODULE_KEYS: readonly string[] = ["forecast"];

export function withoutRetiredModules(keys: string[]): string[] {
  return keys.filter((k) => !RETIRED_MODULE_KEYS.includes(k));
}

export function withoutRetiredModuleKeys<V>(record: Record<string, V> | null | undefined) {
  if (!record) return record;
  return Object.fromEntries(
    Object.entries(record).filter(([k]) => !RETIRED_MODULE_KEYS.includes(k)),
  ) as Record<string, V>;
}

function nonEmptyRecord<V>(record: Record<string, V> | null | undefined) {
  return record && Object.keys(record).length > 0 ? record : undefined;
}

export interface ProfileLifecycle {
  getProfile(userId: string, email?: string): Promise<any>;
  updateProfile(userId: string, body: any, email?: string): Promise<any>;
  resetFinancialData(userId: string, email?: string): Promise<any>;
  sendPasswordReset(userId: string): Promise<any>;
  updateChecklist(userId: string, step: string, completed: boolean): Promise<any>;
}

@Injectable()
export class UserProfileService implements ProfileLifecycle {
  constructor(
    @InjectRepository(UserProfile)
    private readonly userProfileRepository: Repository<UserProfile>,
    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(AccountDetail)
    private readonly accountDetailRepository: Repository<AccountDetail>,
    @InjectRepository(BankConnection)
    private readonly bankConnectionRepository: Repository<BankConnection>,
    @InjectRepository(BudgetEntry)
    private readonly budgetEntryRepository: Repository<BudgetEntry>,
    @InjectRepository(TaxRecord)
    private readonly taxRecordRepository: Repository<TaxRecord>,
    @Optional()
    @Inject(USER_IDENTITY_ADAPTER)
    private readonly identityAdapter?: UserIdentityAdapter,
    @Optional()
    private readonly dataSource?: DataSource,
  ) {}

  formatProfile(profile: UserProfile): any {
    return {
      ...profile,
      firstName: profile.firstName ?? null,
      lastName: profile.lastName ?? null,
      annualSalary:
        profile.annualSalary !== null && profile.annualSalary !== undefined
          ? Number(profile.annualSalary)
          : null,
      monthlyTakeHome:
        profile.monthlyTakeHome !== null && profile.monthlyTakeHome !== undefined
          ? Number(profile.monthlyTakeHome)
          : null,
      hasResetFinancialData: Boolean(profile.hasResetFinancialData),
      onboardingCompleted: Boolean(profile.onboardingCompleted),
      propertyOwnershipShare:
        profile.propertyOwnershipShare !== null && profile.propertyOwnershipShare !== undefined
          ? Number(profile.propertyOwnershipShare)
          : 100.0,
      secondIncomeMonthly:
        profile.secondIncomeMonthly !== null && profile.secondIncomeMonthly !== undefined
          ? Number(profile.secondIncomeMonthly)
          : null,
      rentalIncomeMonthly:
        profile.rentalIncomeMonthly !== null && profile.rentalIncomeMonthly !== undefined
          ? Number(profile.rentalIncomeMonthly)
          : null,
      buyToLetPropertyValue:
        profile.buyToLetPropertyValue !== null && profile.buyToLetPropertyValue !== undefined
          ? Number(profile.buyToLetPropertyValue)
          : null,
      buyToLetMonthlyRental:
        profile.buyToLetMonthlyRental !== null && profile.buyToLetMonthlyRental !== undefined
          ? Number(profile.buyToLetMonthlyRental)
          : null,
      buyToLetMortgageBalance:
        profile.buyToLetMortgageBalance !== null && profile.buyToLetMortgageBalance !== undefined
          ? Number(profile.buyToLetMortgageBalance)
          : null,
      buyToLetMortgageRate:
        profile.buyToLetMortgageRate !== null && profile.buyToLetMortgageRate !== undefined
          ? Number(profile.buyToLetMortgageRate)
          : null,
      buyToLetMortgageType: profile.buyToLetMortgageType || "interest-only",
      pensionPercent:
        profile.pensionPercent !== null && profile.pensionPercent !== undefined
          ? Number(profile.pensionPercent)
          : profile.hasResetFinancialData
            ? 0
            : 5.0,
      pensionEmployerPercent:
        profile.pensionEmployerPercent !== null && profile.pensionEmployerPercent !== undefined
          ? Number(profile.pensionEmployerPercent)
          : profile.hasResetFinancialData
            ? 0
            : 3.0,
      isSalarySacrifice:
        profile.isSalarySacrifice !== null && profile.isSalarySacrifice !== undefined
          ? profile.hasResetFinancialData && Number(profile.pensionPercent) === 0
            ? false
            : Boolean(profile.isSalarySacrifice)
          : !profile.hasResetFinancialData,
      isSalarySacrificeEmployerNi:
        profile.isSalarySacrificeEmployerNi !== null &&
        profile.isSalarySacrificeEmployerNi !== undefined
          ? profile.hasResetFinancialData && Number(profile.pensionPercent) === 0
            ? false
            : Boolean(profile.isSalarySacrificeEmployerNi)
          : false,
      monthlySavingsTarget:
        profile.monthlySavingsTarget !== null && profile.monthlySavingsTarget !== undefined
          ? Number(profile.monthlySavingsTarget)
          : null,
      savingsDefaultInterestRate:
        profile.savingsDefaultInterestRate !== null &&
        profile.savingsDefaultInterestRate !== undefined
          ? Number(profile.savingsDefaultInterestRate)
          : 5.0,
      savingsAllocationMode: profile.savingsAllocationMode || "per_account",
      setupChecklistCompletedSteps: Array.isArray(profile.setupChecklistCompletedSteps)
        ? profile.setupChecklistCompletedSteps
        : [],
      enabledPages: Array.isArray(profile.enabledPages)
        ? withoutRetiredModules(profile.enabledPages)
        : ["accounts", "budget", "savings", "pension", "mortgage"],
      dashboardWidgets: Array.isArray(profile.dashboardWidgets)
        ? withoutRetiredModules(profile.dashboardWidgets)
        : ["accounts", "budget", "savings", "pension", "mortgage"],
      dashboardWidgetOrder: Array.isArray(profile.dashboardWidgetOrder)
        ? withoutRetiredModules(profile.dashboardWidgetOrder)
        : ["accounts", "budget", "savings", "pension", "mortgage"],
      dashboardWidgetSizes: nonEmptyRecord(
        withoutRetiredModuleKeys(profile.dashboardWidgetSizes),
      ) || {
        accounts: "wide",
      },
      dashboardWidgetConfig: withoutRetiredModuleKeys(profile.dashboardWidgetConfig) || {},
      customBudgetCategories: Array.isArray(profile.customBudgetCategories)
        ? profile.customBudgetCategories
        : [],
    };
  }

  /**
   * Lazily creates the profile row on first access. The row is empty defaults only (no
   * fabricated financial data). Two parallel first requests can both miss findOne and
   * both insert; user_id is unique, so the loser gets a unique violation (23505) and
   * re-reads the winner's row. Any other error propagates unchanged.
   */
  private async findOrCreateProfile(
    userId: string,
    defaults: Partial<UserProfile>,
  ): Promise<UserProfile> {
    const existing = await this.userProfileRepository.findOne({ where: { userId } });
    if (existing) return existing;

    try {
      return await this.userProfileRepository.save(
        this.userProfileRepository.create({ ...defaults, userId }),
      );
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
      const winner = await this.userProfileRepository.findOne({ where: { userId } });
      if (!winner) throw err;
      return winner;
    }
  }

  async getProfile(userId: string, email?: string): Promise<any> {
    const profile = await this.findOrCreateProfile(userId, {
      userId,
      displayName: null,
      firstName: null,
      lastName: null,
      avatarUrl: null,
      currency: "GBP",
      country: "GB",
      employmentType: null,
      annualSalary: null,
      monthlyTakeHome: null,
      hasSecondIncome: false,
      secondIncomeMonthly: null,
      hasRentalIncome: false,
      rentalIncomeMonthly: null,
      hasMortgage: false,
      mortgageType: "repayment",
      propertyOwnershipShare: 100.0,
      hasBuyToLet: false,
      buyToLetCount: 1,
      buyToLetPropertyValue: null,
      buyToLetMonthlyRental: null,
      buyToLetMortgageBalance: null,
      buyToLetMortgageRate: null,
      buyToLetMortgageType: "interest-only",
      pensionPercent: 5.0,
      pensionEmployerPercent: 3.0,
      isSalarySacrifice: true,
      isSalarySacrificeEmployerNi: false,
      monthlySavingsTarget: null,
      savingsAllocationMode: "per_account",
      savingsDefaultInterestRate: 5.0,
      setupChecklistCompletedSteps: [],
      enabledPages: ["accounts", "budget", "savings", "pension", "mortgage"],
      dashboardWidgets: ["accounts", "budget", "savings", "pension", "mortgage"],
      dashboardWidgetOrder: ["accounts", "budget", "savings", "pension", "mortgage"],
      dashboardWidgetSizes: { accounts: "wide" },
      dashboardWidgetConfig: {},
      onboardingCompleted: false,
    });

    return {
      ...this.formatProfile(profile),
      email: email || null,
    };
  }

  async updateProfile(userId: string, body: any, email?: string): Promise<any> {
    const profile = await this.findOrCreateProfile(userId, {
      userId,
      displayName: null,
      firstName: null,
      lastName: null,
      avatarUrl: null,
      currency: "GBP",
      country: "GB",
      employmentType: null,
      annualSalary: null,
      monthlyTakeHome: null,
      hasSecondIncome: false,
      secondIncomeMonthly: null,
      hasRentalIncome: false,
      rentalIncomeMonthly: null,
      hasMortgage: false,
      propertyOwnershipShare: 100.0,
      pensionPercent: 5.0,
      pensionEmployerPercent: 3.0,
      isSalarySacrifice: true,
      isSalarySacrificeEmployerNi: false,
      monthlySavingsTarget: null,
      savingsAllocationMode: "per_account",
      savingsDefaultInterestRate: 5.0,
      setupChecklistCompletedSteps: [],
      onboardingCompleted: false,
    });

    if (body.displayName !== undefined) profile.displayName = body.displayName ?? null;
    if (body.firstName !== undefined) profile.firstName = body.firstName ?? null;
    if (body.lastName !== undefined) profile.lastName = body.lastName ?? null;
    if (body.avatarUrl !== undefined) profile.avatarUrl = body.avatarUrl ?? null;
    if (body.currency !== undefined) profile.currency = body.currency;
    if (body.country !== undefined) profile.country = body.country;
    if (body.employmentType !== undefined) profile.employmentType = body.employmentType ?? null;
    if (body.annualSalary !== undefined) profile.annualSalary = body.annualSalary ?? null;
    if (body.monthlyTakeHome !== undefined) profile.monthlyTakeHome = body.monthlyTakeHome ?? null;
    if (body.hasSecondIncome !== undefined) profile.hasSecondIncome = body.hasSecondIncome;
    if (body.secondIncomeMonthly !== undefined)
      profile.secondIncomeMonthly = body.secondIncomeMonthly ?? null;
    if (body.hasRentalIncome !== undefined) profile.hasRentalIncome = body.hasRentalIncome;
    if (body.rentalIncomeMonthly !== undefined)
      profile.rentalIncomeMonthly = body.rentalIncomeMonthly ?? null;
    if (body.hasMortgage !== undefined) profile.hasMortgage = body.hasMortgage;
    if (body.mortgageType !== undefined) profile.mortgageType = body.mortgageType;
    if (body.propertyOwnershipShare !== undefined)
      profile.propertyOwnershipShare = body.propertyOwnershipShare;
    if (body.hasBuyToLet !== undefined) profile.hasBuyToLet = body.hasBuyToLet;
    if (body.buyToLetCount !== undefined) profile.buyToLetCount = body.buyToLetCount;
    if (body.buyToLetPropertyValue !== undefined)
      profile.buyToLetPropertyValue = body.buyToLetPropertyValue ?? null;
    if (body.buyToLetMonthlyRental !== undefined)
      profile.buyToLetMonthlyRental = body.buyToLetMonthlyRental ?? null;
    if (body.buyToLetMortgageBalance !== undefined)
      profile.buyToLetMortgageBalance = body.buyToLetMortgageBalance ?? null;
    if (body.buyToLetMortgageRate !== undefined)
      profile.buyToLetMortgageRate = body.buyToLetMortgageRate ?? null;
    if (body.buyToLetMortgageType !== undefined)
      profile.buyToLetMortgageType = body.buyToLetMortgageType;
    if (body.pensionPercent !== undefined) profile.pensionPercent = body.pensionPercent;
    if (body.pensionEmployerPercent !== undefined)
      profile.pensionEmployerPercent = body.pensionEmployerPercent;
    if (body.isSalarySacrifice !== undefined) profile.isSalarySacrifice = body.isSalarySacrifice;
    if (body.isSalarySacrificeEmployerNi !== undefined)
      profile.isSalarySacrificeEmployerNi = body.isSalarySacrificeEmployerNi;
    if (body.monthlySavingsTarget !== undefined)
      profile.monthlySavingsTarget = body.monthlySavingsTarget ?? null;
    if (body.savingsAllocationMode !== undefined)
      profile.savingsAllocationMode = body.savingsAllocationMode;
    if (body.savingsDefaultInterestRate !== undefined)
      profile.savingsDefaultInterestRate = body.savingsDefaultInterestRate;
    if (body.enabledPages !== undefined) profile.enabledPages = body.enabledPages;
    if (body.dashboardWidgets !== undefined) profile.dashboardWidgets = body.dashboardWidgets;
    if (body.dashboardWidgetOrder !== undefined)
      profile.dashboardWidgetOrder = body.dashboardWidgetOrder;
    if (body.dashboardWidgetSizes !== undefined)
      profile.dashboardWidgetSizes = body.dashboardWidgetSizes;
    if (body.dashboardWidgetConfig !== undefined)
      profile.dashboardWidgetConfig = body.dashboardWidgetConfig;
    if (body.customBudgetCategories !== undefined)
      profile.customBudgetCategories = Array.isArray(body.customBudgetCategories)
        ? body.customBudgetCategories
        : [];
    if (body.onboardingCompleted !== undefined)
      profile.onboardingCompleted = Boolean(body.onboardingCompleted);

    const saved = await this.userProfileRepository.save(profile);

    // Synchronize first/last name with identity provider
    if (this.identityAdapter && (body.firstName !== undefined || body.lastName !== undefined)) {
      try {
        await this.identityAdapter.updateName(
          userId,
          body.firstName !== undefined ? body.firstName : profile.firstName || undefined,
          body.lastName !== undefined ? body.lastName : profile.lastName || undefined,
        );
      } catch (err: any) {
        console.warn("Identity name sync warning:", safeErrorSummary(err));
      }
    }

    return {
      ...this.formatProfile(saved),
      email: email || null,
    };
  }

  async resetFinancialData(userId: string, email?: string): Promise<any> {
    const performReset = async (
      accountRepo: Repository<Account>,
      detailRepo: Repository<AccountDetail>,
      txRepo: Repository<Transaction>,
      bankRepo: Repository<BankConnection>,
      budgetRepo: Repository<BudgetEntry>,
      taxRepo: Repository<TaxRecord>,
      profileRepo: Repository<UserProfile>,
    ) => {
      const accounts = await accountRepo.find({
        where: { userId },
        select: { id: true },
      });
      if (accounts.length > 0) {
        const accountIds = accounts.map((a) => a.id);
        await detailRepo.delete({ accountId: In(accountIds) });
      }

      await txRepo.delete({ userId });
      await accountRepo.delete({ userId });
      await bankRepo.delete({ userId });
      await budgetRepo.delete({ userId });
      await taxRepo.delete({ userId });

      let profile = await profileRepo.findOne({ where: { userId } });
      if (!profile) {
        profile = profileRepo.create({ userId });
      }

      profile.annualSalary = null;
      profile.monthlyTakeHome = null;
      profile.hasSecondIncome = false;
      profile.secondIncomeMonthly = null;
      profile.hasRentalIncome = false;
      profile.rentalIncomeMonthly = null;
      profile.hasMortgage = false;
      profile.mortgageType = "repayment";
      profile.propertyOwnershipShare = 100.0;
      profile.hasBuyToLet = false;
      profile.buyToLetCount = 1;
      profile.buyToLetPropertyValue = null;
      profile.buyToLetMonthlyRental = null;
      profile.buyToLetMortgageBalance = null;
      profile.buyToLetMortgageRate = null;
      profile.buyToLetMortgageType = "interest-only";
      profile.pensionPercent = 0;
      profile.pensionEmployerPercent = 0;
      profile.isSalarySacrifice = false;
      profile.isSalarySacrificeEmployerNi = false;
      profile.customBudgetCategories = [];
      profile.monthlySavingsTarget = null;
      profile.setupChecklistCompletedSteps = [];
      profile.hasResetFinancialData = true;
      profile.onboardingCompleted = false;

      return await profileRepo.save(profile);
    };

    let saved: UserProfile;
    if (this.dataSource) {
      saved = await this.dataSource.transaction(async (manager) => {
        return performReset(
          manager.getRepository(Account),
          manager.getRepository(AccountDetail),
          manager.getRepository(Transaction),
          manager.getRepository(BankConnection),
          manager.getRepository(BudgetEntry),
          manager.getRepository(TaxRecord),
          manager.getRepository(UserProfile),
        );
      });
    } else {
      saved = await performReset(
        this.accountRepository,
        this.accountDetailRepository,
        this.transactionRepository,
        this.bankConnectionRepository,
        this.budgetEntryRepository,
        this.taxRecordRepository,
        this.userProfileRepository,
      );
    }

    return {
      success: true,
      message: "All financial data has been reset",
      profile: {
        ...this.formatProfile(saved),
        email: email || null,
      },
    };
  }

  async updateChecklist(userId: string, step: string, completed: boolean): Promise<any> {
    const profile = await this.findOrCreateProfile(userId, {
      userId,
      displayName: null,
      currency: "GBP",
      country: "GB",
      employmentType: null,
      annualSalary: null,
      monthlyTakeHome: null,
      hasSecondIncome: false,
      secondIncomeMonthly: null,
      hasRentalIncome: false,
      rentalIncomeMonthly: null,
      hasMortgage: false,
      propertyOwnershipShare: 100.0,
      pensionPercent: 5.0,
      pensionEmployerPercent: 3.0,
      isSalarySacrifice: true,
      monthlySavingsTarget: null,
      savingsAllocationMode: "per_account",
      savingsDefaultInterestRate: 5.0,
      setupChecklistCompletedSteps: [],
      onboardingCompleted: false,
    });

    const steps = Array.isArray(profile.setupChecklistCompletedSteps)
      ? [...profile.setupChecklistCompletedSteps]
      : [];

    if (completed) {
      if (!steps.includes(step)) {
        steps.push(step);
      }
    } else {
      const idx = steps.indexOf(step);
      if (idx !== -1) {
        steps.splice(idx, 1);
      }
    }

    profile.setupChecklistCompletedSteps = steps;
    const saved = await this.userProfileRepository.save(profile);
    return this.formatProfile(saved);
  }

  /**
   * Triggers a WorkOS password reset for the caller's own address. The address is
   * resolved server-side from the user id (never from the request). Failures are
   * reported honestly as a generic 503 (no provider message is echoed; only the
   * error class/code is logged) so the UI can show its error state.
   */
  async sendPasswordReset(userId: string): Promise<{ success: true }> {
    const fail = (): never => {
      throw new ServiceUnavailableException("Password reset is unavailable. Please try again.");
    };
    if (!this.identityAdapter || !userId) return fail();
    try {
      const email = await this.identityAdapter.getUserEmail(userId);
      if (!email) {
        console.warn("Password reset failed: email not resolved");
        return fail();
      }
      await this.identityAdapter.sendPasswordReset(email);
    } catch (err: unknown) {
      if (err instanceof ServiceUnavailableException) throw err;
      const e = err as { name?: string; code?: string } | null;
      console.warn(`Password reset failed: ${e?.name ?? "Error"}${e?.code ? ` (${e.code})` : ""}`);
      return fail();
    }
    return { success: true };
  }
}
