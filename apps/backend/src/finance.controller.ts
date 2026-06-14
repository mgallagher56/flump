import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { AuthGuard } from "./auth/auth.guard";
import { Account } from "./entities/account.entity";
import { AccountDetail } from "./entities/account-detail.entity";
import { Transaction } from "./entities/transaction.entity";

@Controller()
@UseGuards(AuthGuard)
export class FinanceController {
  constructor(
    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(AccountDetail)
    private readonly accountDetailRepository: Repository<AccountDetail>,
  ) {}

  @Get("accounts")
  async getAccounts(@Req() req: any) {
    const userId = req.user.id;
    let accounts = await this.accountRepository.find({
      where: { userId },
      order: { createdAt: "ASC" },
    });

    // Auto-seed some mock data for development if the user has no accounts yet
    if (accounts.length === 0) {
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
        },
        {
          userId,
          name: "Investment Portfolio",
          type: "Saving" as const,
          balance: 42100.5,
          currency: "GBP",
        },
      ];

      const seeded = await this.accountRepository.save(defaultAccounts);
      accounts = seeded;
    }

    return accounts;
  }

  @Get("accounts/:id")
  async getAccount(@Req() req: any, @Param("id") id: string) {
    const userId = req.user.id;
    const account = await this.accountRepository.findOne({ where: { id, userId } });
    if (!account) {
      throw new NotFoundException("Account not found");
    }
    return account;
  }

  @Get("accounts/:id/details")
  async getAccountDetailsById(@Req() req: any, @Param("id") id: string) {
    const userId = req.user.id;
    const account = await this.accountRepository.findOne({ where: { id, userId } });
    if (!account) {
      throw new NotFoundException("Account not found");
    }
    return this.accountDetailRepository.find({
      where: { accountId: id },
      order: { year: "DESC", month: "ASC" },
    });
  }

  @Get("account-details")
  async getAccountDetails(@Req() req: any) {
    const userId = req.user.id;
    const accounts = await this.accountRepository.find({ where: { userId } });
    if (accounts.length === 0) {
      return [];
    }
    const accountIds = accounts.map((acc) => acc.id);
    let details = await this.accountDetailRepository.find({
      where: { accountId: In(accountIds) },
    });

    // Auto-seed some mock account details if none exist
    if (details.length === 0) {
      const defaultDetails = [];
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;

      for (const acc of accounts) {
        // Create 12 months of mock history values for each account
        for (let i = 0; i < 12; i++) {
          let m = currentMonth - i;
          let y = currentYear;
          if (m <= 0) {
            m += 12;
            y -= 1;
          }

          const multiplier = 1 - i * 0.02;
          const historyValue = Math.round(acc.balance * multiplier * 100) / 100;

          defaultDetails.push({
            accountId: acc.id,
            month: m,
            year: y,
            value: historyValue,
          });
        }
      }
      details = await this.accountDetailRepository.save(defaultDetails);
    }

    return details;
  }

  @Post("accounts")
  async createAccount(@Req() req: any, @Body() body: { name: string; type: any }) {
    const userId = req.user.id;
    const account = await this.accountRepository.save({
      userId,
      name: body.name,
      type: body.type,
      balance: 0,
      currency: "GBP",
    });

    // Seed 12 months of empty details for the new account
    const year = new Date().getFullYear();
    const currentYearValues = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      year,
      value: 0,
      accountId: account.id,
    }));
    await this.accountDetailRepository.save(currentYearValues);
    return account;
  }

  @Patch("accounts/:id")
  async updateAccount(
    @Req() req: any,
    @Param("id") id: string,
    @Body() body: { name?: string; type?: any },
  ) {
    const userId = req.user.id;
    const account = await this.accountRepository.findOne({ where: { id, userId } });
    if (!account) {
      throw new NotFoundException("Account not found");
    }
    if (body.name) account.name = body.name;
    if (body.type) account.type = body.type;
    return this.accountRepository.save(account);
  }

  @Delete("accounts/:id")
  async deleteAccount(@Req() req: any, @Param("id") id: string) {
    const userId = req.user.id;
    const account = await this.accountRepository.findOne({ where: { id, userId } });
    if (!account) {
      throw new NotFoundException("Account not found");
    }
    // Delete details first
    await this.accountDetailRepository.delete({ accountId: id });
    await this.accountRepository.remove(account);
    return { success: true };
  }

  @Post("accounts/:id/details/year")
  async addYear(@Req() req: any, @Param("id") id: string, @Body() body: { year: number }) {
    const userId = req.user.id;
    const account = await this.accountRepository.findOne({ where: { id, userId } });
    if (!account) throw new NotFoundException("Account not found");

    const yearWithMonths = Array.from({ length: 12 }, (_, i) => i + 1).map((month) => ({
      accountId: id,
      month,
      year: body.year,
      value: 0,
    }));
    return this.accountDetailRepository.save(yearWithMonths);
  }

  @Put("accounts/:id/details")
  async updateDetails(
    @Req() req: any,
    @Param("id") id: string,
    @Body() body: { values: { month: number; year: number; value: number }[] },
  ) {
    const userId = req.user.id;
    const account = await this.accountRepository.findOne({ where: { id, userId } });
    if (!account) throw new NotFoundException("Account not found");

    for (const item of body.values) {
      let detail = await this.accountDetailRepository.findOne({
        where: { accountId: id, month: item.month, year: item.year },
      });
      if (!detail) {
        detail = this.accountDetailRepository.create({
          accountId: id,
          month: item.month,
          year: item.year,
          value: item.value,
        });
      } else {
        detail.value = item.value;
      }
      await this.accountDetailRepository.save(detail);
    }
    return { success: true };
  }

  @Delete("accounts/:id/details/:year")
  async deleteYear(@Req() req: any, @Param("id") id: string, @Param("year") year: number) {
    const userId = req.user.id;
    const account = await this.accountRepository.findOne({ where: { id, userId } });
    if (!account) throw new NotFoundException("Account not found");

    await this.accountDetailRepository.delete({ accountId: id, year });
    return { success: true };
  }

  @Get("transactions")
  async getTransactions(@Req() req: any) {
    const userId = req.user.id;
    let transactions = await this.transactionRepository.find({
      where: { userId },
      order: { timestamp: "DESC" },
    });

    // Auto-seed some mock transactions for development if none exist
    if (transactions.length === 0) {
      const accounts = await this.accountRepository.find({ where: { userId } });
      if (accounts.length > 0) {
        const defaultTransactions = [
          {
            accountId: accounts[0].id,
            userId,
            amount: -45.5,
            description: "Grocery Store checkout",
            category: "Food",
          },
          {
            accountId: accounts[0].id,
            userId,
            amount: 2500.0,
            description: "Bi-weekly Payroll Direct Deposit",
            category: "Salary",
          },
          {
            accountId: accounts[1].id,
            userId,
            amount: 15.0,
            description: "Monthly savings interest accrual",
            category: "Interest",
          },
          {
            accountId: accounts[0].id,
            userId,
            amount: -120.0,
            description: "Electric utility bill",
            category: "Utilities",
          },
        ];
        transactions = await this.transactionRepository.save(defaultTransactions);
      }
    }

    return transactions;
  }
}
