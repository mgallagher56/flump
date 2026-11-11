import {
  type MonthlyPortfolioHistoryPoint,
  PortfolioSnapshot,
  type ResolvedAccount,
} from "@flump/finance-engine";
import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { Account } from "./entities/account.entity";
import { AccountDetail } from "./entities/account-detail.entity";
import { UserProfile } from "./entities/user-profile.entity";

export type AccountType =
  | "Current"
  | "Saving"
  | "Mortgage"
  | "Loan"
  | "Credit Card"
  | "Owed"
  | "Investment"
  | "Pension";

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
  resolvedAccounts: ResolvedAccount[];
  monthlyHistory: MonthlyPortfolioHistoryPoint[];
  currency: string;
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
  ) {}

  async getAccounts(userId: string): Promise<AccountWithDetails[]> {
    let accounts = await this.accountRepository.find({
      where: { userId },
      order: { createdAt: "ASC" },
    });

    const profile = await this.userProfileRepository.findOne({ where: { userId } });

    // Auto-seed mock data for development if the user has no accounts yet and has not reset data
    if (accounts.length === 0 && !profile?.hasResetFinancialData) {
      const defaultAccounts = [
        {
          userId,
          name: "Main Checking",
          type: "Current" as const,
          balance: 2450.75,
          currency: "GBP",
        },
        {
          userId,
          name: "High Yield Savings",
          type: "Saving" as const,
          balance: 15800.0,
          currency: "GBP",
          interestRate: 4.5,
          monthlyContribution: 250.0,
        },
        {
          userId,
          name: "Cash ISA — Trading 212",
          type: "Saving" as const,
          balance: 42100.5,
          currency: "GBP",
          interestRate: 7.0,
          monthlyContribution: 300.0,
        },
        {
          userId,
          name: "Workplace Pension — Nest",
          type: "Pension" as const,
          balance: 18500.0,
          currency: "GBP",
          interestRate: 5.5,
          monthlyContribution: 433.0,
          isCurrent: true,
        },
      ];

      const seeded = await this.accountRepository.save(defaultAccounts);
      accounts = seeded;
    }

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
    const account: Account = this.accountRepository.create({
      ...body,
      userId,
    } as Partial<Account>);
    return this.accountRepository.save(account);
  }

  async updateAccount(userId: string, id: string, body: UpdateAccountDto): Promise<Account> {
    const account = await this.accountRepository.findOne({
      where: { id, userId },
    });
    if (!account) {
      throw new NotFoundException("Account not found");
    }

    Object.assign(account, body);
    return this.accountRepository.save(account);
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
      resolvedAccounts: snapshot.getResolvedAccounts(),
      monthlyHistory: snapshot.getMonthlyHistory(),
      currency: accounts[0]?.currency || "GBP",
    };
  }
}
