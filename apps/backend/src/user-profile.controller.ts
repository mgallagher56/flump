import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { WorkOS } from "@workos-inc/node";
import { In, Repository } from "typeorm";
import { AuthGuard } from "./auth/auth.guard";
import { Account } from "./entities/account.entity";
import { AccountDetail } from "./entities/account-detail.entity";
import { BankConnection } from "./entities/bank-connection.entity";
import { BudgetEntry } from "./entities/budget-entry.entity";
import { TaxRecord } from "./entities/tax-record.entity";
import { Transaction } from "./entities/transaction.entity";
import { UserProfile } from "./entities/user-profile.entity";

@Controller()
@UseGuards(AuthGuard)
export class UserProfileController {
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
    private readonly configService: ConfigService,
  ) {}

  private formatProfile(profile: UserProfile): any {
    return {
      ...profile,
      firstName: profile.firstName ?? null,
      lastName: profile.lastName ?? null,
      hasResetFinancialData: Boolean(profile.hasResetFinancialData),
      onboardingCompleted: Boolean(profile.onboardingCompleted),
      annualSalary:
        profile.annualSalary !== null && profile.annualSalary !== undefined
          ? Number(profile.annualSalary)
          : null,
      monthlyTakeHome:
        profile.monthlyTakeHome !== null && profile.monthlyTakeHome !== undefined
          ? Number(profile.monthlyTakeHome)
          : null,
      secondIncomeMonthly:
        profile.secondIncomeMonthly !== null && profile.secondIncomeMonthly !== undefined
          ? Number(profile.secondIncomeMonthly)
          : null,
      rentalIncomeMonthly:
        profile.rentalIncomeMonthly !== null && profile.rentalIncomeMonthly !== undefined
          ? Number(profile.rentalIncomeMonthly)
          : null,
      propertyOwnershipShare:
        profile.propertyOwnershipShare !== null && profile.propertyOwnershipShare !== undefined
          ? Number(profile.propertyOwnershipShare)
          : 100.0,
      mortgageType: profile.mortgageType || "repayment",
      hasBuyToLet: Boolean(profile.hasBuyToLet),
      buyToLetCount: profile.buyToLetCount ? Number(profile.buyToLetCount) : 1,
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
      enabledPages: Array.isArray(profile.enabledPages)
        ? profile.enabledPages
        : ["accounts", "budget", "savings", "pension", "mortgage", "forecast", "tax"],
      dashboardWidgets: Array.isArray(profile.dashboardWidgets)
        ? profile.dashboardWidgets
        : ["accounts", "budget", "savings", "pension", "mortgage", "forecast", "tax"],
      dashboardWidgetOrder: Array.isArray(profile.dashboardWidgetOrder)
        ? profile.dashboardWidgetOrder
        : ["accounts", "budget", "savings", "pension", "mortgage", "forecast", "tax"],
      dashboardWidgetSizes: profile.dashboardWidgetSizes || {
        accounts: "wide",
      },
      dashboardWidgetConfig: profile.dashboardWidgetConfig || {},
      customBudgetCategories: Array.isArray(profile.customBudgetCategories)
        ? profile.customBudgetCategories
        : [],
    };
  }

  @Get("user-profile")
  async getUserProfile(@Req() req: any): Promise<any> {
    const userId = req.user.id;
    let profile = await this.userProfileRepository.findOne({ where: { userId } });

    if (!profile) {
      profile = await this.userProfileRepository.save(
        this.userProfileRepository.create({
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
          enabledPages: ["accounts", "budget", "savings", "pension", "mortgage", "forecast", "tax"],
          dashboardWidgets: [
            "accounts",
            "budget",
            "savings",
            "pension",
            "mortgage",
            "forecast",
            "tax",
          ],
          dashboardWidgetOrder: [
            "accounts",
            "budget",
            "savings",
            "pension",
            "mortgage",
            "forecast",
            "tax",
          ],
          dashboardWidgetSizes: { accounts: "wide" },
          dashboardWidgetConfig: {},
          onboardingCompleted: false,
        }),
      );
    }

    return {
      ...this.formatProfile(profile),
      email: req.user?.email || null,
    };
  }

  @Patch("user-profile")
  async updateUserProfile(
    @Req() req: any,
    @Body()
    body: {
      displayName?: string | null;
      firstName?: string | null;
      lastName?: string | null;
      avatarUrl?: string | null;
      currency?: string;
      country?: string;
      employmentType?: "employed" | "self-employed" | "other" | null;
      annualSalary?: number | null;
      monthlyTakeHome?: number | null;
      hasSecondIncome?: boolean;
      secondIncomeMonthly?: number | null;
      hasRentalIncome?: boolean;
      rentalIncomeMonthly?: number | null;
      hasMortgage?: boolean;
      mortgageType?: "repayment" | "interest-only";
      propertyOwnershipShare?: number;
      hasBuyToLet?: boolean;
      buyToLetCount?: number;
      buyToLetPropertyValue?: number | null;
      buyToLetMonthlyRental?: number | null;
      buyToLetMortgageBalance?: number | null;
      buyToLetMortgageRate?: number | null;
      buyToLetMortgageType?: "repayment" | "interest-only";
      pensionPercent?: number;
      pensionEmployerPercent?: number;
      isSalarySacrifice?: boolean;
      isSalarySacrificeEmployerNi?: boolean;
      monthlySavingsTarget?: number | null;
      savingsAllocationMode?: "total" | "per_account";
      savingsDefaultInterestRate?: number;
      enabledPages?: string[];
      dashboardWidgets?: string[];
      dashboardWidgetOrder?: string[];
      dashboardWidgetSizes?: Record<string, "normal" | "wide">;
      dashboardWidgetConfig?: Record<string, any>;
      customBudgetCategories?: string[];
      onboardingCompleted?: boolean;
    },
  ): Promise<any> {
    const userId = req.user.id;
    let profile = await this.userProfileRepository.findOne({ where: { userId } });

    if (!profile) {
      profile = this.userProfileRepository.create({
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
    }

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

    // Synchronize first/last name with WorkOS if API key is configured
    const workosApiKey = this.configService.get<string>("WORKOS_API_KEY");
    if (workosApiKey && (body.firstName !== undefined || body.lastName !== undefined)) {
      try {
        const workos = new WorkOS(workosApiKey);
        await workos.userManagement.updateUser({
          userId,
          ...(body.firstName !== undefined ? { firstName: body.firstName || "" } : {}),
          ...(body.lastName !== undefined ? { lastName: body.lastName || "" } : {}),
        });
      } catch (e) {
        console.warn("WorkOS user update failed:", e);
      }
    }

    return {
      ...this.formatProfile(saved),
      email: req.user?.email || null,
    };
  }

  @Post("user-profile/change-password")
  async changePassword(@Req() req: any, @Body() body: { newPassword?: string }): Promise<any> {
    const userId = req.user.id;
    if (!body.newPassword || body.newPassword.length < 8) {
      throw new BadRequestException("Password must be at least 8 characters long");
    }

    const workosApiKey = this.configService.get<string>("WORKOS_API_KEY");
    if (workosApiKey) {
      try {
        const workos = new WorkOS(workosApiKey);
        await workos.userManagement.updateUser({
          userId,
          password: body.newPassword,
        });
      } catch (err: any) {
        throw new BadRequestException(
          err?.message || "Failed to update password with authentication provider",
        );
      }
    }

    return { success: true, message: "Password updated successfully" };
  }

  @Post("user-profile/send-password-reset")
  async sendPasswordReset(@Req() req: any, @Body() body?: { email?: string }): Promise<any> {
    const email = body?.email || req.user?.email;
    if (!email) {
      throw new BadRequestException("Email is required to send password reset");
    }

    const workosApiKey = this.configService.get<string>("WORKOS_API_KEY");
    if (workosApiKey) {
      try {
        const workos = new WorkOS(workosApiKey);
        await workos.userManagement.createPasswordReset({ email });
      } catch (err: any) {
        throw new BadRequestException(err?.message || "Failed to send password reset email");
      }
    }

    return { success: true, message: "Password reset email sent" };
  }

  @Post("user-profile/reset-financial-data")
  async resetFinancialData(@Req() req: any): Promise<any> {
    const userId = req.user.id;

    // Delete accounts and related account details
    const accounts = await this.accountRepository.find({
      where: { userId },
      select: ["id"],
    });
    if (accounts.length > 0) {
      const accountIds = accounts.map((a) => a.id);
      await this.accountDetailRepository.delete({ accountId: In(accountIds) });
    }

    await this.transactionRepository.delete({ userId });
    await this.accountRepository.delete({ userId });
    await this.bankConnectionRepository.delete({ userId });
    await this.budgetEntryRepository.delete({ userId });
    await this.taxRecordRepository.delete({ userId });

    // Reset financial profile fields
    let profile = await this.userProfileRepository.findOne({ where: { userId } });
    if (!profile) {
      profile = this.userProfileRepository.create({ userId });
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

    const saved = await this.userProfileRepository.save(profile);
    return {
      success: true,
      message: "All financial data has been reset",
      profile: {
        ...this.formatProfile(saved),
        email: req.user?.email || null,
      },
    };
  }

  @Patch("user-profile/checklist")
  async updateChecklist(
    @Req() req: any,
    @Body() body: { step: string; completed: boolean },
  ): Promise<any> {
    const userId = req.user.id;
    let profile = await this.userProfileRepository.findOne({ where: { userId } });

    if (!profile) {
      profile = this.userProfileRepository.create({
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
    }

    const steps = Array.isArray(profile.setupChecklistCompletedSteps)
      ? [...profile.setupChecklistCompletedSteps]
      : [];

    if (body.completed) {
      if (!steps.includes(body.step)) {
        steps.push(body.step);
      }
    } else {
      const idx = steps.indexOf(body.step);
      if (idx !== -1) {
        steps.splice(idx, 1);
      }
    }

    profile.setupChecklistCompletedSteps = steps;
    const saved = await this.userProfileRepository.save(profile);
    return this.formatProfile(saved);
  }
}
