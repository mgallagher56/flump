import { BankSyncOrchestrator } from "@flump/banking/server";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { Account } from "./entities/account.entity";
import { AccountDetail } from "./entities/account-detail.entity";
import { BankConnection } from "./entities/bank-connection.entity";
import { Transaction } from "./entities/transaction.entity";
import { UserProfile } from "./entities/user-profile.entity";
import { BankProviderRegistry } from "./providers/provider.registry";

@Injectable()
export class FinanceService {
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

  async getAccounts(userId: string) {
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

  async getAccount(userId: string, id: string) {
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
      details,
    };
  }

  async createAccount(userId: string, body: any) {
    const account = this.accountRepository.create({
      ...body,
      userId,
    });
    return this.accountRepository.save(account);
  }

  async updateAccount(userId: string, id: string, body: any) {
    const account = await this.accountRepository.findOne({
      where: { id, userId },
    });
    if (!account) {
      throw new NotFoundException("Account not found");
    }
    Object.assign(account, body);
    return this.accountRepository.save(account);
  }

  async deleteAccount(userId: string, id: string) {
    const account = await this.accountRepository.findOne({
      where: { id, userId },
    });
    if (!account) {
      throw new NotFoundException("Account not found");
    }
    await this.accountDetailRepository.delete({ accountId: id });
    await this.transactionRepository.delete({ accountId: id });
    await this.accountRepository.remove(account);
    return { success: true };
  }

  async getTransactions(userId: string, accountId?: string) {
    const where: any = { userId };
    if (accountId) {
      where.accountId = accountId;
    }
    return this.transactionRepository.find({
      where,
      order: { timestamp: "DESC" },
    });
  }

  async createTransaction(userId: string, body: any) {
    const transaction = this.transactionRepository.create({
      ...body,
      userId,
    });
    return this.transactionRepository.save(transaction);
  }

  async getBankConnections(userId: string) {
    return this.bankConnectionRepository.find({
      where: { userId },
      order: { createdAt: "DESC" },
    });
  }

  async connectBank(userId: string, body: { institutionId: string; token?: string }) {
    const { institutionId, token } = body;
    const provider = this.providerRegistry?.getProvider
      ? this.providerRegistry.getProvider(institutionId)
      : null;

    // 1. Token-based auth
    if (token && provider) {
      const names: { [key: string]: string } = {
        starling: "Starling Bank",
        monzo: "Monzo Bank",
        trading212: "Trading 212",
        hsbc: "HSBC Bank",
        barclays: "Barclays",
        revolut: "Revolut",
        santander: "Santander",
        natwest: "NatWest",
        lloyds: "Lloyds Bank",
        chase: "Chase",
      };
      const name = names[institutionId.toLowerCase()] || "External Bank";

      let conn: BankConnection;
      const found = await this.bankConnectionRepository.findOne({
        where: { userId, institutionId },
      });

      if (found) {
        conn = found;
      } else {
        conn = this.bankConnectionRepository.create
          ? this.bankConnectionRepository.create({
              userId,
              institutionId,
              institutionName: name,
            })
          : ({ userId, institutionId, institutionName: name } as any);
      }

      conn.status = "connected";
      conn.authType = "token";
      conn.accessToken = BankSyncOrchestrator.encryptToken(token);
      conn.lastSyncedAt = new Date();
      const savedConn: BankConnection = (await this.bankConnectionRepository.save(conn)) as any;

      try {
        const accountsCount = await this.syncProviderAccounts(savedConn, userId, token);
        return {
          success: true,
          connection: savedConn,
          message: `Connected successfully! Sync'd ${accountsCount} accounts.`,
        };
      } catch (err) {
        savedConn.status = "error";
        await this.bankConnectionRepository.save(savedConn);
        throw new BadRequestException(`Token sync verification failed: ${(err as Error).message}`);
      }
    }

    // 2. OAuth check
    const clientId = this.configService?.get
      ? this.configService.get<string>(`${institutionId.toUpperCase()}_CLIENT_ID`)
      : null;
    const clientSecret = this.configService?.get
      ? this.configService.get<string>(`${institutionId.toUpperCase()}_CLIENT_SECRET`)
      : null;

    if (clientId && clientSecret && provider) {
      const backendUrl = this.configService.get<string>("BACKEND_URL", "http://localhost:4000");
      const redirectUri = `${backendUrl}/bank-connections/callback`;
      const state = `${institutionId}:${userId}`;
      const redirectUrl = provider.getAuthUrl(clientId, redirectUri, state);

      return {
        success: true,
        oauth: true,
        redirectUrl,
      };
    }

    // 3. Unsupported or unconfigured
    if (!provider) {
      throw new BadRequestException(
        `Financial institution "${institutionId}" is not currently supported for direct bank connections. Supported providers: Monzo Bank and Starling Bank.`,
      );
    }

    const providerNames: { [key: string]: string } = {
      starling: "Starling Bank",
      monzo: "Monzo Bank",
      trading212: "Trading 212",
      hsbc: "HSBC Bank",
      barclays: "Barclays",
      revolut: "Revolut",
      santander: "Santander",
      natwest: "NatWest",
      lloyds: "Lloyds Bank",
      chase: "Chase",
    };
    const institutionName = providerNames[institutionId.toLowerCase()] || institutionId;

    throw new BadRequestException(
      `OAuth credentials are not configured on the server for ${institutionName}. Please connect using a Personal Access Token or configure ${institutionId.toUpperCase()}_CLIENT_ID and ${institutionId.toUpperCase()}_CLIENT_SECRET.`,
    );
  }

  async syncBankConnection(userId: string, id: string) {
    const connection = await this.bankConnectionRepository.findOne({
      where: { id, userId },
    });

    if (!connection) {
      throw new NotFoundException("Bank connection not found");
    }

    const provider = this.providerRegistry?.getProvider
      ? this.providerRegistry.getProvider(connection.institutionId)
      : null;

    if (provider && connection.accessToken) {
      try {
        let token = BankSyncOrchestrator.decryptToken(connection.accessToken);

        if (
          connection.expiresAt &&
          connection.expiresAt.getTime() - Date.now() < 300000 &&
          connection.refreshToken
        ) {
          const refreshToken = BankSyncOrchestrator.decryptToken(connection.refreshToken);
          const clientId = this.configService.get<string>(
            `${connection.institutionId.toUpperCase()}_CLIENT_ID`,
          );
          const clientSecret = this.configService.get<string>(
            `${connection.institutionId.toUpperCase()}_CLIENT_SECRET`,
          );
          const redirectUri =
            this.configService.get<string>(
              `${connection.institutionId.toUpperCase()}_REDIRECT_URI`,
            ) || "http://localhost:5173/auth/callback";

          if (clientId && clientSecret) {
            const tokenRes = await provider.exchangeCode(
              clientId,
              clientSecret,
              redirectUri,
              refreshToken,
            );
            token = tokenRes.accessToken;
            connection.accessToken = BankSyncOrchestrator.encryptToken(tokenRes.accessToken);
            if (tokenRes.refreshToken) {
              connection.refreshToken = BankSyncOrchestrator.encryptToken(tokenRes.refreshToken);
            }
            if (tokenRes.expiresIn) {
              connection.expiresAt = new Date(Date.now() + tokenRes.expiresIn * 1000);
            }
            await this.bankConnectionRepository.save(connection);
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

    throw new BadRequestException("Bank connection has no active token or credentials to refresh.");
  }

  async deleteBankConnection(userId: string, id: string) {
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

  async syncProviderAccounts(
    connection: BankConnection,
    userId: string,
    tokenOrEncryptedToken: string,
  ): Promise<number> {
    const provider = this.providerRegistry?.getProvider
      ? this.providerRegistry.getProvider(connection.institutionId)
      : null;
    if (!provider) return 0;

    const accessToken = BankSyncOrchestrator.decryptToken(tokenOrEncryptedToken);
    const providerAccounts = await provider.fetchAccounts(accessToken);
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    for (const pa of providerAccounts) {
      const normalizedBalance = BankSyncOrchestrator.normalizeAccountBalance(pa.type, pa.balance);

      const existingAccount = await this.accountRepository.findOne({
        where: {
          connectionId: connection.id,
          externalAccountId: pa.externalAccountId,
          userId,
        },
      });

      let targetAccount: Account;
      if (!existingAccount) {
        targetAccount = this.accountRepository.create
          ? this.accountRepository.create({
              userId,
              name: pa.name,
              type: pa.type,
              balance: normalizedBalance,
              currency: pa.currency,
              connectionId: connection.id,
              externalAccountId: pa.externalAccountId,
            })
          : ({
              id: `acc-${Math.random().toString(36).slice(2)}`,
              userId,
              name: pa.name,
              type: pa.type,
              balance: normalizedBalance,
              currency: pa.currency,
              connectionId: connection.id,
              externalAccountId: pa.externalAccountId,
            } as any);
      } else {
        existingAccount.name = pa.name;
        existingAccount.type = pa.type;
        existingAccount.balance = normalizedBalance;
        targetAccount = existingAccount;
      }
      const savedAcc = (await this.accountRepository.save(targetAccount)) || targetAccount;

      const detail = this.accountDetailRepository.findOne
        ? await this.accountDetailRepository.findOne({
            where: { accountId: savedAcc.id, month: currentMonth, year: currentYear },
          })
        : null;
      let targetDetail: AccountDetail;
      if (!detail) {
        targetDetail = this.accountDetailRepository.create
          ? this.accountDetailRepository.create({
              accountId: savedAcc.id,
              month: currentMonth,
              year: currentYear,
              value: savedAcc.balance,
            })
          : ({
              accountId: savedAcc.id,
              month: currentMonth,
              year: currentYear,
              value: savedAcc.balance,
            } as any);
      } else {
        detail.value = savedAcc.balance;
        targetDetail = detail;
      }
      if (this.accountDetailRepository.save) {
        await this.accountDetailRepository.save(targetDetail);
      }

      try {
        const providerTxs = await provider.fetchTransactions(accessToken, pa.externalAccountId);
        for (const pt of providerTxs) {
          const exists = this.transactionRepository.findOne
            ? await this.transactionRepository.findOne({
                where: {
                  accountId: savedAcc.id,
                  userId,
                  amount: pt.amount,
                  description: pt.description,
                  timestamp: pt.timestamp,
                },
              })
            : null;

          if (!exists && this.transactionRepository.save) {
            await this.transactionRepository.save({
              accountId: savedAcc.id,
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
}
