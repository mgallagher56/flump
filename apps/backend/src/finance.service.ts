import { randomUUID } from "node:crypto";
import { BankSyncOrchestrator } from "@flump/banking/server";
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  AccountIntakeService,
  type CreateAccountDto,
  currentUkYearMonth,
  type UpdateAccountDto,
  type UpdateBalancesDto,
} from "./account-intake.service";
import { toPublicConnection } from "./bank-connection.public";
import { Account } from "./entities/account.entity";
import { AccountDetail } from "./entities/account-detail.entity";
import { BankConnection } from "./entities/bank-connection.entity";
import { Transaction } from "./entities/transaction.entity";
import { UserProfile } from "./entities/user-profile.entity";
import type { CreateTransactionDto } from "./finance.controller";
import { safeErrorSummary } from "./log-safe";
import { BankProviderRegistry } from "./providers/provider.registry";
import { writeConnectedSnapshot } from "./snapshots/connected-write";
import { londonDate } from "./snapshots/london-date";
import { resignHistoryForType, storedBalance } from "./snapshots/stored-balance";

@Injectable()
export class FinanceService {
  private readonly logger = new Logger(FinanceService.name);
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

  async updateBalances(userId: string, body: UpdateBalancesDto) {
    return this.accountIntakeService.updateBalances(userId, body);
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
      timestamp: this.parseTimestamp(body.timestamp),
    };
    return Object.fromEntries(
      Object.entries(fields).filter(([, value]) => value !== undefined),
    ) as Partial<Transaction>;
  }

  /**
   * A client timestamp is stored as a Date, so the response carries the normalised ISO string
   * rather than echoing whatever string was sent. Unparseable input is a 400, not a DB error.
   */
  private parseTimestamp(value: string | Date | undefined): Date | undefined {
    if (value === undefined || value === null) return undefined;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException("timestamp must be a valid ISO date-time");
    }
    return date;
  }

  async createTransaction(userId: string, body: CreateTransactionDto) {
    // accountId is a non-nullable column; an undefined id in a TypeORM where
    // clause would match any row, so reject it before querying.
    if (!body.accountId) {
      throw new BadRequestException("accountId is required");
    }
    const account = await this.accountRepository.findOne({
      where: { id: body.accountId, userId },
    });
    if (!account) {
      throw new NotFoundException("Account not found");
    }
    const transaction = this.transactionRepository.create({
      ...this.pickTransactionFields(body),
      userId,
    });
    return this.transactionRepository.save(transaction);
  }

  async getBankConnections(userId: string) {
    const connections = await this.bankConnectionRepository.find({
      where: { userId },
      order: { createdAt: "DESC" },
    });
    return connections.map(toPublicConnection);
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
          connection: toPublicConnection(savedConn),
          message: `Connected successfully! Sync'd ${accountsCount} accounts.`,
        };
      } catch (err) {
        savedConn.status = "error";
        await this.bankConnectionRepository.save(savedConn);
        this.logger.error(`Token sync verification failed: ${safeErrorSummary(err)}`);
        throw new BadRequestException(
          "Token sync verification failed. Check the token and try again.",
        );
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

    if (!connection.accessToken) {
      await this.failNeedingReconnect(connection);
    }

    if (provider) {
      // Stored ciphertext that cannot be decrypted (wrong key, corruption) must not surface
      // decrypt or key details; the user has to reconnect.
      try {
        BankSyncOrchestrator.decryptToken(connection.accessToken as string);
        if (connection.refreshToken) BankSyncOrchestrator.decryptToken(connection.refreshToken);
      } catch (err) {
        this.logger.error(
          `Stored tokens unusable for ${connection.institutionName}: ${safeErrorSummary(err)}`,
        );
        await this.failNeedingReconnect(connection);
      }

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

        return {
          success: true,
          connection: toPublicConnection(connection),
          message: `Sync'd ${accountsCount} accounts.`,
        };
      } catch (err) {
        this.logger.error(
          `API Sync failed for ${connection.institutionName}: ${safeErrorSummary(err)}`,
        );
        connection.status = "error";
        await this.bankConnectionRepository.save(connection);
        // Provider error text is logged, not returned: it can echo credentials or internals.
        return {
          success: false,
          connection: toPublicConnection(connection),
          error: "Sync failed. Please try again, or reconnect the bank if it keeps failing.",
        };
      }
    }

    throw new BadRequestException("Bank connection has no active token or credentials to refresh.");
  }

  private async failNeedingReconnect(connection: BankConnection): Promise<never> {
    connection.status = "error";
    await this.bankConnectionRepository.save(connection);
    throw new BadRequestException(
      "This bank connection needs to be reconnected. Please reconnect it to resume syncing.",
    );
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
    accessToken: string,
  ): Promise<number> {
    const provider = this.providerRegistry?.getProvider
      ? this.providerRegistry.getProvider(connection.institutionId)
      : null;
    if (!provider) return 0;

    const providerAccounts = await provider.fetchAccounts(accessToken);
    // One clock reading for year, month and date (E30 D3): a sync at month-end midnight can never
    // pair next month's date with this month's key (the table CHECK would reject it).
    const today = londonDate();
    const [currentYear, currentMonth] = today.split("-").map(Number) as [number, number];

    for (const pa of providerAccounts) {
      const normalizedBalance = storedBalance(pa.type, pa.balance);

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
              id: `acc-${randomUUID()}`,
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
        if (existingAccount.type !== pa.type) {
          // A provider that reclassifies an account: the stored balance and history follow the
          // new type's sign rule (BE-05, audit H6). History first, while the row is the old type,
          // so the database check holds after each statement even without a transaction.
          await resignHistoryForType(this.accountDetailRepository, existingAccount.id, pa.type);
          existingAccount.balance = storedBalance(pa.type, Number(existingAccount.balance));
        }
        existingAccount.type = pa.type;
        // The balance is not touched here: writeConnectedSnapshot moves it atomically, and not at
        // all when this month's value was entered by hand (E30 D7).
        targetAccount = existingAccount;
      }
      const savedAcc = (await this.accountRepository.save(targetAccount)) || targetAccount;

      // One row per account per London month, shared with the check-in (unique index, E23 D22).
      await writeConnectedSnapshot(this.accountDetailRepository, this.accountRepository, {
        accountId: savedAcc.id,
        userId,
        year: currentYear,
        month: currentMonth,
        value: normalizedBalance,
        asOfDate: today,
      });

      // E19 D8-A: synced transactions are deliberately not stored. Balances are enough for
      // net worth and debt, and merchant descriptions are high-risk personal data.
    }

    return providerAccounts.length;
  }
}
