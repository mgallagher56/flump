import { BankSyncOrchestrator } from "@flump/banking/server";
import { BadRequestException, Injectable, NotFoundException, Optional } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  AccountIntakeService,
  type CreateAccountDto,
  type UpdateAccountDto,
} from "./account-intake.service";
import { Account } from "./entities/account.entity";
import { AccountDetail } from "./entities/account-detail.entity";
import { BankConnection } from "./entities/bank-connection.entity";
import { Transaction } from "./entities/transaction.entity";
import { UserProfile } from "./entities/user-profile.entity";
import type { CreateTransactionDto } from "./finance.controller";
import { BankProviderRegistry } from "./providers/provider.registry";

@Injectable()
export class FinanceService {
  private readonly accountIntakeService: AccountIntakeService;

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
    @Optional()
    accountIntakeService?: AccountIntakeService,
  ) {
    this.accountIntakeService =
      accountIntakeService ??
      new AccountIntakeService(
        accountRepository,
        accountDetailRepository,
        userProfileRepository,
        bankConnectionRepository,
      );
  }

  async getAccounts(userId: string) {
    return this.accountIntakeService.getAccounts(userId);
  }

  async getAccount(userId: string, id: string) {
    return this.accountIntakeService.getAccount(userId, id);
  }

  async getAccountDetails(userId: string, accountId?: string) {
    return this.accountIntakeService.getAccountDetails(userId, accountId);
  }

  async getPortfolioSnapshot(userId: string) {
    return this.accountIntakeService.getPortfolioSnapshot(userId);
  }

  async createAccount(userId: string, body: CreateAccountDto) {
    return this.accountIntakeService.createAccount(userId, body);
  }

  async updateAccount(userId: string, id: string, body: UpdateAccountDto) {
    return this.accountIntakeService.updateAccount(userId, id, body);
  }

  async deleteAccount(userId: string, id: string) {
    // Throws NotFoundException unless the account belongs to the caller.
    await this.accountIntakeService.getAccount(userId, id);
    await this.transactionRepository.delete({ accountId: id });
    return this.accountIntakeService.deleteAccount(userId, id);
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

  /**
   * Allow-list of client-writable transaction fields. `id` and `userId` are
   * never copied from a request body.
   */
  private pickTransactionFields(body: CreateTransactionDto): Partial<Transaction> {
    const fields = {
      accountId: body.accountId,
      amount: body.amount,
      description: body.description,
      category: body.category,
      timestamp: body.timestamp as Date | undefined,
    };
    return Object.fromEntries(
      Object.entries(fields).filter(([, value]) => value !== undefined),
    ) as Partial<Transaction>;
  }

  async createTransaction(userId: string, body: CreateTransactionDto) {
    const transaction = this.transactionRepository.create({
      ...this.pickTransactionFields(body),
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
        const refreshed = await BankSyncOrchestrator.refreshConnectionTokensIfNeeded({
          connection,
          exchangeRefreshToken: async (plainRefreshToken) => {
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

            if (!clientId || !clientSecret) {
              throw new Error(`Missing OAuth credentials for ${connection.institutionId}`);
            }

            return provider.exchangeCode(clientId, clientSecret, redirectUri, plainRefreshToken);
          },
        });

        if (refreshed.wasRefreshed) {
          if (refreshed.updatedEncryptedAccessToken) {
            connection.accessToken = refreshed.updatedEncryptedAccessToken;
          }
          if (refreshed.updatedEncryptedRefreshToken) {
            connection.refreshToken = refreshed.updatedEncryptedRefreshToken;
          }
          if (refreshed.newExpiresAt) {
            connection.expiresAt = refreshed.newExpiresAt;
          }
          await this.bankConnectionRepository.save(connection);
        }

        const accountsCount = await this.syncProviderAccounts(
          connection,
          userId,
          refreshed.activeAccessToken,
        );
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
