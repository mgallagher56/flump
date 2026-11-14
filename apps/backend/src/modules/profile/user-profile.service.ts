import {
  MAX_BUDGET_CATEGORY_NAME_LENGTH,
  MAX_CUSTOM_BUDGET_CATEGORIES,
  type UpdateProfileRequest,
} from "@flump/api-contract";
import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  Optional,
  ServiceUnavailableException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, type EntityTarget, In, type ObjectLiteral, Repository } from "typeorm";
import { recordAuditEvent } from "../../audit/audit-events";
import { withdrawAllConsents } from "../../audit/consents";
import { accountDeletedException } from "../../auth/recent-login";
import { safeErrorSummary } from "../../common/log-safe";
import { preconditionFailed, withVersionClaim } from "../../contract/etag";
import { Account } from "../../entities/account.entity";
import { AccountDetail } from "../../entities/account-detail.entity";
import { BankConnection } from "../../entities/bank-connection.entity";
import { BudgetEntry } from "../../entities/budget-entry.entity";
import { ImportBatch } from "../../entities/import-batch.entity";
import { McpToken } from "../../entities/mcp-token.entity";
import { SnapshotCheckin } from "../../entities/snapshot-checkin.entity";
import { TaxRecord } from "../../entities/tax-record.entity";
import { Transaction } from "../../entities/transaction.entity";
import {
  HOUSING_STATUSES,
  STUDENT_LOAN_PLANS,
  type StudentLoanPlan,
  TAX_REGIONS,
  UserProfile,
} from "../../entities/user-profile.entity";
import { USER_IDENTITY_ADAPTER, type UserIdentityAdapter } from "../../identity/identity.adapter";
import { BANK_CONSENT_REVOKER, type BankConsentRevoker } from "../banking/bank-consent-revoker";
import { AccountDeletionService } from "../privacy/account-deletion.service";
import { type RemovedCounts, USER_DATA_REGISTRY } from "../privacy/user-data-registry";
import { writeOnboardingSnapshot } from "../snapshots/first-snapshot";

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

// E23 profile facts: validated here so a bad value is a 400, never a CHECK-violation 500.
function oneOfOrNull<T extends string>(
  value: unknown,
  allowed: readonly T[],
  field: string,
): T | null {
  if (value === null) return null;
  if (typeof value === "string" && (allowed as readonly string[]).includes(value))
    return value as T;
  throw new BadRequestException(`${field} must be one of ${allowed.join(", ")} or null`);
}

function birthYearOrNull(value: unknown): number | null {
  if (value === null) return null;
  const thisYear = new Date().getUTCFullYear();
  if (typeof value === "number" && Number.isInteger(value) && value >= 1900 && value <= thisYear) {
    return value;
  }
  throw new BadRequestException(`birthYear must be a whole year from 1900 to ${thisYear} or null`);
}

function studentLoanPlansOrNull(value: unknown): StudentLoanPlan[] | null {
  if (value === null) return null;
  if (!Array.isArray(value)) {
    throw new BadRequestException("studentLoanPlans must be an array or null");
  }
  const plans = value.map((plan) => oneOfOrNull(plan, STUDENT_LOAN_PLANS, "studentLoanPlans[]"));
  return [...new Set(plans.filter((plan): plan is StudentLoanPlan => plan !== null))];
}

function moneyOrNull(value: unknown, field: string): number | null {
  if (value === null) return null;
  if (typeof value === "number" && Number.isFinite(value) && value >= 0 && value < 1e10) {
    return Math.round(value * 100) / 100;
  }
  throw new BadRequestException(`${field} must be a non-negative amount or null`);
}

/** The profile row as it goes on the wire (E21 contract): every key present, decimals as numbers. */
function formatProfileRow(profile: UserProfile) {
  // last_active_at is retention bookkeeping (BE-06), not part of the profile contract.
  const { lastActiveAt: _lastActiveAt, ...rest } = profile;
  return {
    ...rest,
    // Nullable columns with no DB default are absent from a just-inserted entity; pin them to
    // null so every response has the same keys (E21 contract).
    displayName: profile.displayName ?? null,
    avatarUrl: profile.avatarUrl ?? null,
    employmentType: profile.employmentType ?? null,
    firstName: profile.firstName ?? null,
    lastName: profile.lastName ?? null,
    taxRegion: profile.taxRegion ?? null,
    birthYear: profile.birthYear ?? null,
    studentLoanPlans: profile.studentLoanPlans ?? null,
    housingStatus: profile.housingStatus ?? null,
    monthlyHousingCost: profile.monthlyHousingCost ?? null,
    monthlyOtherOutgoings: profile.monthlyOtherOutgoings ?? null,
    // Net worth choices: the column defaults, so a just-inserted entity shows the same values.
    netWorthCountsProperty: profile.netWorthCountsProperty ?? true,
    netWorthCountsStudentLoan: profile.netWorthCountsStudentLoan ?? false,
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
        : false,
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

export type FormattedProfile = ReturnType<typeof formatProfileRow>;

/** GET /user-profile and every write that returns the profile: the row plus the caller's email. */
export type ProfileView = FormattedProfile & { email: string | null };

export interface ResetFinancialDataResult {
  success: true;
  message: string;
  profile: ProfileView;
}

export interface ProfileLifecycle {
  getProfile(userId: string, email?: string): Promise<ProfileView>;
  updateProfile(userId: string, body: UpdateProfileRequest, email?: string): Promise<ProfileView>;
  resetFinancialData(userId: string, email?: string): Promise<ResetFinancialDataResult>;
  sendPasswordReset(userId: string): Promise<{ success: true }>;
  updateChecklist(
    userId: string,
    step: string,
    completed: boolean,
    email?: string,
  ): Promise<ProfileView>;
}

/** Rows removed by a financial data reset, per registry table (counts only, for the audit event). */
export type FinancialDataResetCounts = RemovedCounts;

/**
 * Sets every financial field of the profile back to its default (M-PRIV1). Kept: identity (names,
 * avatar), locale (currency, country), layout preferences (pages, widgets) and the net worth
 * choices (what net worth counts is a preference, not financial data).
 */
export function clearFinancialProfileFields(profile: UserProfile): void {
  profile.employmentType = null;
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
  profile.savingsAllocationMode = "per_account";
  profile.savingsDefaultInterestRate = 5.0;
  profile.taxRegion = null;
  profile.birthYear = null;
  profile.studentLoanPlans = null;
  profile.housingStatus = null;
  profile.monthlyHousingCost = null;
  profile.monthlyOtherOutgoings = null;
  profile.setupChecklistCompletedSteps = [];
  profile.hasResetFinancialData = true;
  profile.onboardingCompleted = false;
}

/** The empty defaults a profile row is created with when an update arrives before any read. */
const PROFILE_UPDATE_DEFAULTS = (userId: string): Partial<UserProfile> => ({
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
  isSalarySacrifice: false,
  isSalarySacrificeEmployerNi: false,
  monthlySavingsTarget: null,
  savingsAllocationMode: "per_account",
  savingsDefaultInterestRate: 5.0,
  setupChecklistCompletedSteps: [],
  onboardingCompleted: false,
  netWorthCountsProperty: true,
  netWorthCountsStudentLoan: false,
});

@Injectable()
export class UserProfileService implements ProfileLifecycle {
  private readonly logger = new Logger(UserProfileService.name);

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
    @Optional()
    @InjectRepository(SnapshotCheckin)
    private readonly snapshotCheckinRepository?: Repository<SnapshotCheckin>,
    @Optional()
    @InjectRepository(ImportBatch)
    private readonly importBatchRepository?: Repository<ImportBatch>,
    @Optional()
    @InjectRepository(McpToken)
    private readonly mcpTokenRepository?: Repository<McpToken>,
    @Optional()
    @Inject(BANK_CONSENT_REVOKER)
    private readonly bankConsentRevoker?: BankConsentRevoker,
    @Optional()
    private readonly accountDeletion?: AccountDeletionService,
  ) {}

  /** Bank-revoke seam (BE-04): never blocks the reset; a failure is logged without detail. */
  private async revokeBankConsent(userId: string, repo: Repository<BankConnection>): Promise<void> {
    if (!this.bankConsentRevoker) return;
    try {
      const connections = await repo.find({
        where: { userId },
        select: { id: true, institutionId: true, authType: true },
      });
      await this.bankConsentRevoker.revokeAll(userId, connections ?? []);
    } catch (err) {
      this.logger.warn(`Bank consent revoke warning: ${safeErrorSummary(err)}`);
    }
  }

  formatProfile(profile: UserProfile): FormattedProfile {
    return formatProfileRow(profile);
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
    // An erased account must not get a fresh profile row from a request made with a token issued
    // before the deletion (WorkOS access tokens stay valid until they expire).
    if (await this.accountDeletion?.isErased(userId)) {
      throw accountDeletedException();
    }

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

  async getProfile(userId: string, email?: string): Promise<ProfileView> {
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
      isSalarySacrifice: false,
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
      netWorthCountsProperty: true,
      netWorthCountsStudentLoan: false,
    });

    return {
      ...this.formatProfile(profile),
      email: email || null,
    };
  }

  /**
   * `expectedVersion` (from If-Match, BE-09) makes the update conditional: the version claim, the
   * read and the write run in one transaction (withVersionClaim), so a stale ETag (or a profile
   * that does not exist yet) is a 412 and writes nothing, and a validation error after the claim
   * rolls the claim back.
   */
  async updateProfile(
    userId: string,
    body: UpdateProfileRequest,
    email?: string,
    expectedVersion?: Date,
  ): Promise<ProfileView> {
    let wasOnboarded = false;
    let profile: UserProfile;
    let saved: UserProfile;
    if (expectedVersion) {
      ({ profile, saved, wasOnboarded } = await withVersionClaim(
        this.userProfileRepository,
        { user_id: userId },
        expectedVersion,
        preconditionFailed,
        async (repository) => {
          const row = await repository.findOne({ where: { userId } });
          if (!row) throw preconditionFailed();
          const onboarded = this.applyProfileUpdate(row, body);
          return { profile: row, saved: await repository.save(row), wasOnboarded: onboarded };
        },
      ));
    } else {
      profile = await this.findOrCreateProfile(userId, PROFILE_UPDATE_DEFAULTS(userId));
      wasOnboarded = this.applyProfileUpdate(profile, body);
      saved = await this.userProfileRepository.save(profile);
    }

    // E30 D8: finishing onboarding records the first monthly snapshot of the user's accounts.
    if (!wasOnboarded && saved.onboardingCompleted) {
      try {
        await writeOnboardingSnapshot(this.accountRepository, this.accountDetailRepository, userId);
      } catch (err: unknown) {
        // The profile is already saved; a missed first snapshot is recoverable in the check-in.
        this.logger.warn(`First snapshot warning: ${safeErrorSummary(err)}`);
      }
    }

    // Synchronize first/last name with identity provider
    if (this.identityAdapter && (body.firstName !== undefined || body.lastName !== undefined)) {
      try {
        await this.identityAdapter.updateName(
          userId,
          // null clears the name here; the adapter treats a missing name as "leave alone".
          body.firstName !== undefined
            ? (body.firstName ?? undefined)
            : profile.firstName || undefined,
          body.lastName !== undefined
            ? (body.lastName ?? undefined)
            : profile.lastName || undefined,
        );
      } catch (err: unknown) {
        this.logger.warn(`Identity name sync warning: ${safeErrorSummary(err)}`);
      }
    }

    return {
      ...this.formatProfile(saved),
      email: email || null,
    };
  }

  /**
   * Applies an update body to a loaded profile row in place. Throws a 400 for an invalid E23 value;
   * returns whether the profile was onboarded before this update.
   */
  private applyProfileUpdate(profile: UserProfile, body: UpdateProfileRequest): boolean {
    const wasOnboarded = Boolean(profile.onboardingCompleted);
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
    if (body.customBudgetCategories !== undefined) {
      const categories = Array.isArray(body.customBudgetCategories)
        ? body.customBudgetCategories
        : [];
      if (categories.length > MAX_CUSTOM_BUDGET_CATEGORIES) {
        throw new BadRequestException(
          `At most ${MAX_CUSTOM_BUDGET_CATEGORIES} custom budget categories are allowed`,
        );
      }
      for (const name of categories) {
        if (typeof name !== "string" || name.length > MAX_BUDGET_CATEGORY_NAME_LENGTH) {
          throw new BadRequestException(
            `Category names must be strings of at most ${MAX_BUDGET_CATEGORY_NAME_LENGTH} characters`,
          );
        }
      }
      profile.customBudgetCategories = categories;
    }
    if (body.onboardingCompleted !== undefined)
      profile.onboardingCompleted = Boolean(body.onboardingCompleted);
    if (body.netWorthCountsProperty !== undefined)
      profile.netWorthCountsProperty = body.netWorthCountsProperty;
    if (body.netWorthCountsStudentLoan !== undefined)
      profile.netWorthCountsStudentLoan = body.netWorthCountsStudentLoan;
    if (body.taxRegion !== undefined) {
      profile.taxRegion = oneOfOrNull(body.taxRegion, TAX_REGIONS, "taxRegion");
    }
    if (body.birthYear !== undefined) profile.birthYear = birthYearOrNull(body.birthYear);
    if (body.studentLoanPlans !== undefined) {
      profile.studentLoanPlans = studentLoanPlansOrNull(body.studentLoanPlans);
    }
    if (body.housingStatus !== undefined) {
      profile.housingStatus = oneOfOrNull(body.housingStatus, HOUSING_STATUSES, "housingStatus");
    }
    if (body.monthlyHousingCost !== undefined) {
      profile.monthlyHousingCost = moneyOrNull(body.monthlyHousingCost, "monthlyHousingCost");
    }
    if (body.monthlyOtherOutgoings !== undefined) {
      profile.monthlyOtherOutgoings = moneyOrNull(
        body.monthlyOtherOutgoings,
        "monthlyOtherOutgoings",
      );
    }
    return wasOnboarded;
  }

  async resetFinancialData(userId: string, email?: string): Promise<ResetFinancialDataResult> {
    // The reset writes a profile row; never for an erased account (see findOrCreateProfile).
    if (await this.accountDeletion?.isErased(userId)) {
      throw accountDeletedException();
    }
    // Repositories by entity: the transaction's when there is a DataSource, else the injected ones.
    const injected = new Map<EntityTarget<ObjectLiteral>, Repository<ObjectLiteral> | undefined>([
      [Account, this.accountRepository],
      [AccountDetail, this.accountDetailRepository],
      [Transaction, this.transactionRepository],
      [BankConnection, this.bankConnectionRepository],
      [BudgetEntry, this.budgetEntryRepository],
      [TaxRecord, this.taxRecordRepository],
      [UserProfile, this.userProfileRepository],
      [SnapshotCheckin, this.snapshotCheckinRepository],
      [ImportBatch, this.importBatchRepository],
      [McpToken, this.mcpTokenRepository],
    ]);

    // Bank consent first (BE-04 seam, BE-12 fills it): identifiers only, never the stored tokens.
    await this.revokeBankConsent(userId, this.bankConnectionRepository);

    const performReset = async (
      repoFor: (entity: EntityTarget<ObjectLiteral>) => Repository<ObjectLiteral> | undefined,
    ) => {
      // Rows removed per table, for the audit event. `affected` is a count, never a value.
      const removed = (result: { affected?: number | null } | undefined): number =>
        result?.affected ?? 0;
      const counts: FinancialDataResetCounts = {};
      // Every registry table marked financial-clear or revoke (M-PRIV1), in deletion order. The
      // profile is the exception: its row stays and its financial fields are cleared below.
      for (const t of USER_DATA_REGISTRY) {
        if (t.entity === UserProfile || t.reset.kind === "keep") continue;
        const repo = repoFor(t.entity);
        if (t.entity === AccountDetail && repo) {
          // Belt and braces: history rows keyed to the user's accounts, whatever their user_id.
          const accounts: Array<{ id: string }> =
            ((await repoFor(Account)?.find({ where: { userId }, select: { id: true } })) as
              | Array<{ id: string }>
              | undefined) ?? [];
          let n = removed(await repo.delete({ userId }));
          if (accounts.length > 0) {
            n += removed(await repo.delete({ accountId: In(accounts.map((a) => a.id)) }));
          }
          counts[t.key] = n;
          continue;
        }
        counts[t.key] = removed(await repo?.delete({ userId }));
      }

      const profileRepo = repoFor(UserProfile) as Repository<UserProfile>;
      let profile = await profileRepo.findOne({ where: { userId } });
      if (!profile) {
        profile = profileRepo.create({ userId });
      }
      clearFinancialProfileFields(profile);
      return { saved: await profileRepo.save(profile), counts };
    };

    let outcome: { saved: UserProfile; counts: FinancialDataResetCounts };
    if (this.dataSource) {
      outcome = await this.dataSource.transaction(async (manager) => {
        const result = await performReset((entity) => manager.getRepository(entity));
        // BE-06: the reset revoked every AI token and bank connection, so their consents close,
        // and the action is recorded in the same transaction.
        await withdrawAllConsents(manager, { userId, kind: "ai_access" });
        await withdrawAllConsents(manager, { userId, kind: "bank_access" });
        await recordAuditEvent(manager, {
          userId,
          action: "financial_data.reset",
          metadata: { removed: result.counts },
        });
        return result;
      });
    } else {
      outcome = await performReset((entity) => injected.get(entity));
    }
    const { saved, counts } = outcome;

    // Audit trail (security review): one structured event after the transaction has committed.
    // The user id and row counts only; no amounts, names or email. A logging failure never turns
    // a completed reset into an error.
    try {
      // A plain object, not a string: the log scrubber passes this exact shape through with the
      // user id intact (isAuditEventEntry) and would blank the id inside a string.
      this.logger.log({ event: "financial_data_reset", userId, removed: counts });
    } catch {
      // logging failure is ignored
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

  async updateChecklist(
    userId: string,
    step: string,
    completed: boolean,
    email?: string,
  ): Promise<ProfileView> {
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
      isSalarySacrifice: false,
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
    // Same shape as GET /user-profile, email included (E21).
    return { ...this.formatProfile(saved), email: email || null };
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
        this.logger.warn("Password reset failed: email not resolved");
        return fail();
      }
      await this.identityAdapter.sendPasswordReset(email);
    } catch (err: unknown) {
      if (err instanceof ServiceUnavailableException) throw err;
      const e = err as { name?: string; code?: string } | null;
      this.logger.warn(
        `Password reset failed: ${e?.name ?? "Error"}${e?.code ? ` (${e.code})` : ""}`,
      );
      return fail();
    }
    return { success: true };
  }
}
