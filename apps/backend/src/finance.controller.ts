import { BankSyncOrchestrator } from "@flump/banking/server";
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
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { AuthGuard } from "./auth/auth.guard";
import { Account } from "./entities/account.entity";
import { AccountDetail } from "./entities/account-detail.entity";
import { BankConnection } from "./entities/bank-connection.entity";
import { Transaction } from "./entities/transaction.entity";
import { UserProfile } from "./entities/user-profile.entity";
import { BankProviderRegistry } from "./providers/provider.registry";

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
    @InjectRepository(BankConnection)
    private readonly bankConnectionRepository: Repository<BankConnection>,
    @InjectRepository(UserProfile)
    private readonly userProfileRepository: Repository<UserProfile>,
    private readonly providerRegistry: BankProviderRegistry,
    private readonly configService: ConfigService,
  ) {}

  @Get("accounts")
  async getAccounts(@Req() req: any) {
    const userId = req.user.id;
    let accounts = await this.accountRepository.find({
      where: { userId },
      order: { createdAt: "ASC" },
    });

    const profile = await this.userProfileRepository.findOne({ where: { userId } });

    // Auto-seed some mock data for development if the user has no accounts yet and has not reset data
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
          name: "Investment Portfolio",
          type: "Saving" as const,
          balance: 42100.5,
          currency: "GBP",
          interestRate: 7.0,
          monthlyContribution: 300.0,
        },
      ];

      const seeded = await this.accountRepository.save(defaultAccounts);
      accounts = seeded;
    }

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
    }));
  }

  @Get("accounts/:id")
  async getAccount(@Req() req: any, @Param("id") id: string) {
    const userId = req.user.id;
    const account = await this.accountRepository.findOne({ where: { id, userId } });
    if (!account) {
      throw new NotFoundException("Account not found");
    }
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
    };
  }

  @Get("accounts/:id/details")
  async getAccountDetailsById(@Req() req: any, @Param("id") id: string) {
    const userId = req.user.id;
    const account = await this.accountRepository.findOne({ where: { id, userId } });
    if (!account) {
      throw new NotFoundException("Account not found");
    }
    const details = await this.accountDetailRepository.find({
      where: { accountId: id },
      order: { year: "DESC", month: "ASC" },
    });
    return details.map((d) => ({
      ...d,
      accountId: d.accountId,
      account_id: d.accountId,
      value: Number(d.value),
    }));
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

    return details.map((d) => ({
      ...d,
      accountId: d.accountId,
      account_id: d.accountId,
      value: Number(d.value),
    }));
  }

  @Post("accounts")
  async createAccount(
    @Req() req: any,
    @Body()
    body: {
      name: string;
      type: any;
      balance?: number;
      interestRate?: number | null;
      monthlyContribution?: number | null;
      isCurrent?: boolean;
    },
  ) {
    const userId = req.user.id;
    const initialBalance =
      body.balance !== undefined && body.balance !== null ? Number(body.balance) : 0;
    const isCurrent = body.isCurrent !== undefined ? Boolean(body.isCurrent) : true;
    const account = await this.accountRepository.save({
      userId,
      name: body.name,
      type: body.type,
      balance: initialBalance,
      interestRate:
        body.interestRate !== undefined && body.interestRate !== null
          ? Number(body.interestRate)
          : null,
      monthlyContribution:
        isCurrent && body.monthlyContribution !== undefined && body.monthlyContribution !== null
          ? Number(body.monthlyContribution)
          : null,
      isCurrent,
      currency: "GBP",
    });

    // Seed 12 months of details for the new account
    const year = new Date().getFullYear();
    const currentYearValues = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      year,
      value: initialBalance,
      accountId: account.id,
    }));
    await this.accountDetailRepository.save(currentYearValues);
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
    };
  }

  @Patch("accounts/:id")
  async updateAccount(
    @Req() req: any,
    @Param("id") id: string,
    @Body()
    body: {
      name?: string;
      type?: any;
      balance?: number;
      interestRate?: number | null;
      monthlyContribution?: number | null;
      isCurrent?: boolean;
    },
  ) {
    const userId = req.user.id;
    const account = await this.accountRepository.findOne({ where: { id, userId } });
    if (!account) {
      throw new NotFoundException("Account not found");
    }
    if (body.name !== undefined) account.name = body.name;
    if (body.type !== undefined) account.type = body.type;
    if (body.balance !== undefined && body.balance !== null) {
      const numBal = Number(body.balance);
      account.balance = numBal;

      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;
      const detail = await this.accountDetailRepository.findOne({
        where: { accountId: id, month: currentMonth, year: currentYear },
      });
      if (detail) {
        detail.value = numBal;
        await this.accountDetailRepository.save(detail);
      } else {
        await this.accountDetailRepository.save({
          accountId: id,
          month: currentMonth,
          year: currentYear,
          value: numBal,
        });
      }
    }
    if (body.interestRate !== undefined) {
      account.interestRate = body.interestRate !== null ? Number(body.interestRate) : null;
    }
    if (body.isCurrent !== undefined) {
      account.isCurrent = Boolean(body.isCurrent);
    }
    if (body.monthlyContribution !== undefined) {
      account.monthlyContribution =
        body.monthlyContribution !== null ? Number(body.monthlyContribution) : null;
    }
    if (account.isCurrent === false) {
      account.monthlyContribution = null;
    }
    const saved = await this.accountRepository.save(account);
    return {
      ...saved,
      balance: Number(saved.balance),
      interestRate:
        saved.interestRate !== null && saved.interestRate !== undefined
          ? Number(saved.interestRate)
          : null,
      monthlyContribution:
        saved.monthlyContribution !== null && saved.monthlyContribution !== undefined
          ? Number(saved.monthlyContribution)
          : null,
      isCurrent: saved.isCurrent !== false,
    };
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

    // Sync account.balance with the most recent detail value
    const latestDetails = await this.accountDetailRepository.find({
      where: { accountId: id },
      order: { year: "DESC", month: "DESC" },
    });
    if (latestDetails.length > 0) {
      account.balance = Number(latestDetails[0].value);
      await this.accountRepository.save(account);
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

  @Get("bank-connections")
  async getBankConnections(@Req() req: any) {
    const userId = req.user.id;
    return this.bankConnectionRepository.find({
      where: { userId },
      order: { createdAt: "DESC" },
    });
  }

  @Post("bank-connections")
  async connectBank(@Req() req: any, @Body() body: { institutionId: string; token?: string }) {
    const userId = req.user.id;
    const { institutionId, token } = body;

    const provider = this.providerRegistry.getProvider(institutionId);

    // 1. Check if we are doing Token-based authentication (like Starling PAT)
    if (token && provider) {
      const names: { [key: string]: string } = {
        starling: "Starling Bank",
        monzo: "Monzo Bank",
      };
      const name = names[institutionId] || "External Bank";

      let connection = await this.bankConnectionRepository.findOne({
        where: { userId, institutionId },
      });

      if (!connection) {
        connection = this.bankConnectionRepository.create({
          userId,
          institutionId,
          institutionName: name,
        });
      }

      connection.status = "connected";
      connection.authType = "token";
      connection.accessToken = BankSyncOrchestrator.encryptToken(token);
      connection.lastSyncedAt = new Date();
      await this.bankConnectionRepository.save(connection);

      try {
        const accountsCount = await this.syncProviderAccounts(connection, userId, token);
        return {
          success: true,
          connection,
          message: `Connected successfully! Sync'd ${accountsCount} accounts.`,
        };
      } catch (err) {
        connection.status = "error";
        await this.bankConnectionRepository.save(connection);
        throw new Error(`Token sync verification failed: ${(err as Error).message}`);
      }
    }

    // 2. Check if OAuth is configured in .env for this provider
    const clientId = this.configService.get<string>(`${institutionId.toUpperCase()}_CLIENT_ID`);
    const clientSecret = this.configService.get<string>(
      `${institutionId.toUpperCase()}_CLIENT_SECRET`,
    );

    if (clientId && clientSecret && provider) {
      // Return OAuth redirect URL
      const backendUrl = this.configService.get<string>("BACKEND_URL", "http://localhost:4000");
      const redirectUri = `${backendUrl}/bank-connections/callback`;
      // state is encoded as institutionId:userId
      const state = `${institutionId}:${userId}`;
      const redirectUrl = provider.getAuthUrl(clientId, redirectUri, state);

      return {
        success: true,
        oauth: true,
        redirectUrl,
      };
    }

    // 3. Fallback to Mock Sync Mode (Demo Mode) if not configured
    const names: { [key: string]: string } = {
      hsbc: "HSBC Bank",
      barclays: "Barclays Bank",
      monzo: "Monzo Bank (Demo)",
      revolut: "Revolut (Demo)",
      chase: "Chase (Demo)",
      fidelity: "Fidelity Investments (Demo)",
      vanguard: "Vanguard (Demo)",
      starling: "Starling Bank (Demo)",
    };

    const name = names[institutionId] || "External Bank (Demo)";

    let connection = await this.bankConnectionRepository.findOne({
      where: { userId, institutionId },
    });

    if (connection) {
      connection.status = "connected";
      connection.lastSyncedAt = new Date();
      await this.bankConnectionRepository.save(connection);
      return { success: true, connection, message: "Institution re-connected" };
    }

    connection = await this.bankConnectionRepository.save({
      userId,
      institutionId,
      institutionName: name,
      status: "connected",
      authType: "oauth", // default mock value
    });

    const accountsCount = await this.seedMockSyncData(connection, userId);

    return {
      success: true,
      connection,
      message: `Connected successfully (Demo Mode)! Sync'd ${accountsCount} accounts.`,
    };
  }

  @Get("bank-connections/callback")
  async handleCallback(
    @Query("code") code: string,
    @Query("state") state: string,
    @Res() res: any,
  ) {
    const frontendUrl = this.configService.get<string>("FRONTEND_URL", "http://localhost:5173");

    try {
      if (!code || !state) {
        throw new Error("Missing auth code or state parameters");
      }

      const [institutionId, userId] = state.split(":");
      if (!institutionId || !userId) {
        throw new Error("Invalid state parameter format");
      }

      const provider = this.providerRegistry.getProvider(institutionId);
      const clientId = this.configService.get<string>(`${institutionId.toUpperCase()}_CLIENT_ID`);
      const clientSecret = this.configService.get<string>(
        `${institutionId.toUpperCase()}_CLIENT_SECRET`,
      );

      if (!provider || !clientId || !clientSecret) {
        throw new Error(`Provider ${institutionId} is not configured on this server`);
      }

      const backendUrl = this.configService.get<string>("BACKEND_URL", "http://localhost:4000");
      const redirectUri = `${backendUrl}/bank-connections/callback`;

      const tokenResponse = await provider.exchangeCode(clientId, clientSecret, redirectUri, code);

      const names: { [key: string]: string } = {
        monzo: "Monzo Bank",
        starling: "Starling Bank",
      };
      const name = names[institutionId] || "External Bank";

      let connection = await this.bankConnectionRepository.findOne({
        where: { userId, institutionId },
      });

      if (!connection) {
        connection = this.bankConnectionRepository.create({
          userId,
          institutionId,
          institutionName: name,
        });
      }

      connection.status = "connected";
      connection.authType = "oauth";
      connection.accessToken = BankSyncOrchestrator.encryptToken(tokenResponse.accessToken);
      if (tokenResponse.refreshToken) {
        connection.refreshToken = BankSyncOrchestrator.encryptToken(tokenResponse.refreshToken);
      }
      if (tokenResponse.expiresIn) {
        connection.expiresAt = new Date(Date.now() + tokenResponse.expiresIn * 1000);
      }
      connection.lastSyncedAt = new Date();
      await this.bankConnectionRepository.save(connection);

      // Perform initial accounts sync
      await this.syncProviderAccounts(connection, userId, tokenResponse.accessToken);

      // Redirect user back to frontend accounts page
      return res.redirect(`${frontendUrl}/app/accounts?sync=success`);
    } catch (err) {
      console.error("OAuth callback exchange failed:", err);
      return res.redirect(
        `${frontendUrl}/app/accounts?sync=error&message=${encodeURIComponent((err as Error).message)}`,
      );
    }
  }

  @Post("bank-connections/:id/refresh")
  async refreshBankConnection(@Req() req: any, @Param("id") id: string) {
    const userId = req.user.id;
    const connection = await this.bankConnectionRepository.findOne({
      where: { id, userId },
    });

    if (!connection) {
      throw new NotFoundException("Bank connection not found");
    }

    // 1. If connection has an active token, run real sync
    if (connection.accessToken) {
      try {
        let token = BankSyncOrchestrator.decryptToken(connection.accessToken);

        // Check token expiration for OAuth
        if (
          connection.authType === "oauth" &&
          connection.expiresAt &&
          connection.expiresAt < new Date() &&
          connection.refreshToken
        ) {
          // Attempt refresh
          const provider = this.providerRegistry.getProvider(connection.institutionId);
          const clientId = this.configService.get<string>(
            `${connection.institutionId.toUpperCase()}_CLIENT_ID`,
          );
          const clientSecret = this.configService.get<string>(
            `${connection.institutionId.toUpperCase()}_CLIENT_SECRET`,
          );

          if (provider && clientId && clientSecret) {
            const rawRefreshToken = BankSyncOrchestrator.decryptToken(connection.refreshToken);
            const body = new URLSearchParams({
              grant_type: "refresh_token",
              client_id: clientId,
              client_secret: clientSecret,
              refresh_token: rawRefreshToken,
            });
            const tokenUrl =
              connection.institutionId === "monzo"
                ? "https://api.monzo.com/oauth2/token"
                : `${this.configService.get("STARLING_USE_SANDBOX") === "true" ? "https://api-sandbox.starlingbank.com" : "https://api.starlingbank.com"}/oauth/access-token`;

            const res = await fetch(tokenUrl, {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: body.toString(),
            });

            if (res.ok) {
              const data = await res.json();
              connection.accessToken = BankSyncOrchestrator.encryptToken(data.access_token);
              token = data.access_token;
              if (data.refresh_token) {
                connection.refreshToken = BankSyncOrchestrator.encryptToken(data.refresh_token);
              }
              if (data.expires_in) {
                connection.expiresAt = new Date(Date.now() + data.expires_in * 1000);
              }
              await this.bankConnectionRepository.save(connection);
            }
          }
        }

        const accountsCount = await this.syncProviderAccounts(connection, userId, token);
        connection.lastSyncedAt = new Date();
        connection.status = "connected";
        await this.bankConnectionRepository.save(connection);

        return { success: true, connection, message: `Sync'd ${accountsCount} accounts.` };
      } catch (err) {
        console.error(`API Sync failed for ${connection.institutionName}:`, err);
        connection.status = "error";
        await this.bankConnectionRepository.save(connection);
        return { success: false, connection, error: (err as Error).message };
      }
    }

    // 2. Mock Mode Refresh Fallback
    const accounts = await this.accountRepository.find({
      where: { connectionId: connection.id, userId },
    });

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    for (const acc of accounts) {
      const isPositive = Math.random() > 0.4;
      const delta = Math.round((Math.random() * 50 + 5) * 100) / 100;
      const amount = isPositive ? delta : -delta;

      acc.balance = Math.round((Number(acc.balance) + amount) * 100) / 100;
      await this.accountRepository.save(acc);

      await this.transactionRepository.save({
        accountId: acc.id,
        userId,
        amount,
        description: `Simulated sync transaction from ${connection.institutionName}`,
        category: acc.type === "Investment" ? "Investment" : "Food",
        timestamp: now,
      });

      let detail = await this.accountDetailRepository.findOne({
        where: { accountId: acc.id, month: currentMonth, year: currentYear },
      });

      if (!detail) {
        detail = this.accountDetailRepository.create({
          accountId: acc.id,
          month: currentMonth,
          year: currentYear,
          value: acc.balance,
        });
      } else {
        detail.value = acc.balance;
      }
      await this.accountDetailRepository.save(detail);
    }

    connection.lastSyncedAt = now;
    connection.status = "connected";
    await this.bankConnectionRepository.save(connection);

    return { success: true, connection };
  }

  @Delete("bank-connections/:id")
  async deleteBankConnection(@Req() req: any, @Param("id") id: string) {
    const userId = req.user.id;
    const connection = await this.bankConnectionRepository.findOne({
      where: { id, userId },
    });

    if (!connection) {
      throw new NotFoundException("Bank connection not found");
    }

    const accounts = await this.accountRepository.find({
      where: { connectionId: connection.id, userId },
    });

    for (const acc of accounts) {
      await this.accountDetailRepository.delete({ accountId: acc.id });
      await this.transactionRepository.delete({ accountId: acc.id });
      await this.accountRepository.remove(acc);
    }

    await this.bankConnectionRepository.remove(connection);

    return { success: true };
  }

  private async syncProviderAccounts(
    connection: BankConnection,
    userId: string,
    tokenOrEncryptedToken: string,
  ): Promise<number> {
    const provider = this.providerRegistry.getProvider(connection.institutionId);
    if (!provider) return 0;

    const accessToken = BankSyncOrchestrator.decryptToken(tokenOrEncryptedToken);
    const providerAccounts = await provider.fetchAccounts(accessToken);
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    for (const pa of providerAccounts) {
      const normalizedBalance = BankSyncOrchestrator.normalizeAccountBalance(pa.type, pa.balance);

      let account = await this.accountRepository.findOne({
        where: {
          connectionId: connection.id,
          externalAccountId: pa.externalAccountId,
          userId,
        },
      });

      if (!account) {
        account = this.accountRepository.create({
          userId,
          name: pa.name,
          type: pa.type,
          balance: normalizedBalance,
          currency: pa.currency,
          connectionId: connection.id,
          externalAccountId: pa.externalAccountId,
        });
      } else {
        account.name = pa.name;
        account.type = pa.type;
        account.balance = normalizedBalance;
      }
      await this.accountRepository.save(account);

      const detailsCount = await this.accountDetailRepository.count({
        where: { accountId: account.id },
      });

      if (detailsCount === 0) {
        const historyPoints = BankSyncOrchestrator.generateMockHistory(
          normalizedBalance,
          pa.type,
          currentYear,
          currentMonth,
        );
        const historyRows = historyPoints.map((hp) => ({
          accountId: account.id,
          month: hp.month,
          year: hp.year,
          value: hp.value,
        }));
        await this.accountDetailRepository.save(historyRows);
      } else {
        let detail = await this.accountDetailRepository.findOne({
          where: { accountId: account.id, month: currentMonth, year: currentYear },
        });
        if (!detail) {
          detail = this.accountDetailRepository.create({
            accountId: account.id,
            month: currentMonth,
            year: currentYear,
            value: account.balance,
          });
        } else {
          detail.value = account.balance;
        }
        await this.accountDetailRepository.save(detail);
      }

      try {
        const providerTxs = await provider.fetchTransactions(accessToken, pa.externalAccountId);
        for (const pt of providerTxs) {
          const exists = await this.transactionRepository.findOne({
            where: {
              accountId: account.id,
              userId,
              amount: pt.amount,
              description: pt.description,
              timestamp: pt.timestamp,
            },
          });

          if (!exists) {
            await this.transactionRepository.save({
              accountId: account.id,
              userId,
              amount: pt.amount,
              description: pt.description,
              category: pt.category,
              timestamp: pt.timestamp,
            });
          }
        }
      } catch (_txErr) {
        // Skip transactions if provider fetch fails (e.g. pots)
      }
    }

    return providerAccounts.length;
  }

  private async seedMockSyncData(connection: BankConnection, userId: string): Promise<number> {
    const instId = connection.institutionId;
    const accountsData = BankSyncOrchestrator.getMockInstitutionAccounts(instId);

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    for (const acc of accountsData) {
      const saved = await this.accountRepository.save({
        userId,
        name: acc.name,
        type: acc.type,
        balance: acc.balance,
        currency: acc.currency,
        connectionId: connection.id,
        externalAccountId: `ext_${connection.institutionId}_${Math.random().toString(36).substring(7)}`,
      });

      const historyPoints = BankSyncOrchestrator.generateMockHistory(
        acc.balance,
        acc.type,
        currentYear,
        currentMonth,
      );
      const historyRows = historyPoints.map((hp) => ({
        accountId: saved.id,
        month: hp.month,
        year: hp.year,
        value: hp.value,
      }));
      await this.accountDetailRepository.save(historyRows);

      const txs = BankSyncOrchestrator.generateMockTransactions(
        acc.type,
        connection.institutionName,
        now,
      );
      if (txs.length > 0) {
        const txRows = txs.map((tx) => ({
          accountId: saved.id,
          userId,
          amount: tx.amount,
          description: tx.description,
          category: tx.category,
          timestamp: tx.timestamp,
        }));
        await this.transactionRepository.save(txRows);
      }
    }

    return accountsData.length;
  }
}
