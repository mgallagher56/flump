import { randomUUID } from "node:crypto";
import type { CreateTransactionRequest as CreateTransactionDto } from "@flump/api-contract";
import { BankSyncOrchestrator, isBankProviderError } from "@flump/banking/server";
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  AccountIntakeService,
  type CreateAccountDto,
  type UpdateAccountDto,
  type UpdateBalancesDto,
} from "./account-intake.service";
import { recordAuditEvent } from "./audit/audit-events";
import { grantConsentOnce, withdrawConsent } from "./audit/consents";
import { toPublicConnection } from "./bank-connection.public";
import { revokeConnectionConsent } from "./bank-connection-consent";
import { issueOAuthState, withPkceChallenge } from "./bank-connection-oauth";
import {
  accessTokenAad,
  BankConnectionSync,
  ConnectionNeedsReconnectError,
  SYNC_DEADLINE_MS,
  type SyncOutcome,
} from "./bank-connection-sync";
import { type KeysetOrder, keysetPage, type Page, type PageRequest } from "./contract/pagination";
import { Account } from "./entities/account.entity";
import { AccountDetail } from "./entities/account-detail.entity";
import { BankConnection } from "./entities/bank-connection.entity";
import { Transaction } from "./entities/transaction.entity";
import { UserProfile } from "./entities/user-profile.entity";
import { safeErrorSummary } from "./log-safe";
import type { BankProvider } from "./providers/provider.interface";
import { BankProviderRegistry } from "./providers/provider.registry";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** GET /transactions order: newest first, id as tiebreak (keyset pagination). */
const TRANSACTION_ORDER: KeysetOrder = {
  keys: [
    { column: '"t"."timestamp"', kind: "timestamp" },
    { column: '"t"."id"', kind: "uuid" },
  ],
  direction: "DESC",
};

/** GET /bank-connections order: newest first, id as tiebreak (keyset pagination). */
const CONNECTION_ORDER: KeysetOrder = {
  keys: [
    { column: '"c"."created_at"', kind: "timestamp" },
    { column: '"c"."id"', kind: "uuid" },
  ],
  direction: "DESC",
};

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

  listAccounts(userId: string, page: PageRequest) {
    return this.accountIntakeService.listAccounts(userId, page);
  }

  listAccountDetails(userId: string, page: PageRequest, accountId?: string) {
    return this.accountIntakeService.listAccountDetails(userId, page, accountId);
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

  async updateAccount(userId: string, id: string, body: UpdateAccountDto, expectedVersion?: Date) {
    return this.accountIntakeService.updateAccount(userId, id, body, expectedVersion);
  }

  async updateBalances(userId: string, body: UpdateBalancesDto) {
    return this.accountIntakeService.updateBalances(userId, body);
  }

  /**
   * One transaction: ownership check, then transactions, history and the account
   * (AccountIntakeService.deleteAccount). Another user's id is a 404 and deletes nothing.
   */
  async deleteAccount(userId: string, id: string) {
    return this.accountIntakeService.deleteAccount(userId, id);
  }

  /**
   * One page of the user's transactions, newest first (BE-09 keyset paging, M-API1). The page size
   * comes from PAGE_LIMITS.transactions, which carries BE-08's DEFAULT_TRANSACTION_PAGE and
   * MAX_TRANSACTION_PAGE; `offset` (BE-08) skips rows when no cursor is sent. The id breaks
   * timestamp ties so pages never overlap.
   */
  async listTransactions(
    userId: string,
    page: PageRequest & { offset?: number },
    accountId?: string,
  ): Promise<Page<Transaction>> {
    // account_id is a uuid column: no account has a malformed id, so there is nothing to list
    // (and casting it would be a database error). Re-checked so it holds with CONTRACT_MODE=off.
    if (accountId !== undefined && !UUID.test(accountId)) return { items: [], nextCursor: null };
    const qb = this.transactionRepository
      .createQueryBuilder("t")
      .where("t.userId = :userId", { userId });
    if (accountId) qb.andWhere("t.accountId = :accountId", { accountId });
    if (page.offset) qb.offset(page.offset);
    return keysetPage(qb, TRANSACTION_ORDER, page);
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

  /** One page of the user's connections, newest first, without tokens (BE-09, M-API1). */
  async listBankConnections(userId: string, page: PageRequest) {
    const qb = this.bankConnectionRepository
      .createQueryBuilder("c")
      .where("c.userId = :userId", { userId });
    const { items, nextCursor } = await keysetPage(qb, CONNECTION_ORDER, page);
    return { items: items.map(toPublicConnection), nextCursor };
  }

  async connectBank(userId: string, body: { institutionId: string; token?: string }) {
    const { institutionId, token } = body;
    const provider = this.providerRegistry?.getProvider(institutionId) ?? null;
    if (!provider) {
      throw new BadRequestException(
        `Financial institution "${institutionId}" is not currently supported for direct bank connections. Supported providers: Monzo Bank and Starling Bank.`,
      );
    }
    const institutionName =
      INSTITUTION_NAMES[institutionId.toLowerCase()] ?? (token ? "External Bank" : institutionId);

    // 1. Token-based auth: store the token (encrypted, bound to the connection id), then sync.
    if (token) {
      // One transaction (BE-06): the connection, its stored token, the audit row (H12) and the
      // bank-access consent (M-PRIV3) commit together, before the sync verifies the token.
      const id = await this.bankConnectionRepository.manager.transaction(async (m) => {
        // One connection per user and bank (unique index): a double-clicked connect reuses it.
        const [row] = (await m.query(
          `INSERT INTO "bank_connections" ("user_id", "institution_id", "institution_name", "status", "auth_type")
           VALUES ($1, $2, $3, 'connected', 'token')
           ON CONFLICT ("user_id", "institution_id") DO UPDATE SET "updated_at" = now()
           RETURNING "id"`,
          [userId, institutionId, institutionName],
        )) as Array<{ id: string }>;
        const connectionId = (row as { id: string }).id;
        // The token is bound to the row id (AAD), so it is written once the id is known.
        await m.getRepository(BankConnection).update(
          { id: connectionId, userId },
          {
            status: "connected",
            authType: "token",
            accessToken: BankSyncOrchestrator.encryptToken(token, accessTokenAad(connectionId)),
            refreshToken: null,
            expiresAt: null,
          },
        );
        // Every token stored is recorded; a reconnect of the same bank keeps its first consent.
        await recordAuditEvent(m, {
          userId,
          action: "bank_connection.connected",
          targetId: connectionId,
          metadata: { institutionId, authType: "token" },
        });
        await grantConsentOnce(m, {
          userId,
          kind: "bank_access",
          version: `${institutionId}:token`,
          targetId: connectionId,
        });
        return connectionId;
      });

      const result = await this.runSync(userId, id, provider);
      if (result.kind === "busy") throw new ConflictException(SYNC_BUSY_MESSAGE);
      if (result.kind !== "ok") {
        throw new BadRequestException(
          "Token sync verification failed. Check the token and try again.",
        );
      }
      return {
        success: true,
        connection: toPublicConnection(result.connection),
        message: syncMessage(result.outcome),
      };
    }

    // 2. OAuth: a random single-use state and a PKCE challenge (audit M4).
    const clientId = this.oauthConfig(institutionId, "CLIENT_ID");
    const clientSecret = this.oauthConfig(institutionId, "CLIENT_SECRET");
    if (clientId && clientSecret) {
      const redirectUri = this.redirectUri(institutionId);
      const { state, codeChallenge } = await issueOAuthState(
        this.bankConnectionRepository.manager,
        {
          userId,
          institutionId,
          redirectUri,
        },
      );
      const redirectUrl = withPkceChallenge(
        provider.getAuthUrl(clientId, redirectUri, state),
        codeChallenge,
      );
      return { success: true, oauth: true, redirectUrl };
    }

    // 3. Unconfigured.
    throw new BadRequestException(
      `OAuth credentials are not configured on the server for ${institutionName}. Please connect using a Personal Access Token or configure ${institutionId.toUpperCase()}_CLIENT_ID and ${institutionId.toUpperCase()}_CLIENT_SECRET.`,
    );
  }

  async syncBankConnection(userId: string, id: string) {
    const connection = await this.bankConnectionRepository.findOne({ where: { id, userId } });
    if (!connection) {
      throw new NotFoundException("Bank connection not found");
    }
    const provider = this.providerRegistry?.getProvider(connection.institutionId);
    if (!provider) {
      throw new BadRequestException(
        "Bank connection has no active token or credentials to refresh.",
      );
    }

    const result = await this.runSync(userId, id, provider);
    switch (result.kind) {
      case "busy":
        throw new ConflictException(SYNC_BUSY_MESSAGE);
      case "ok":
        return {
          success: true,
          connection: toPublicConnection(result.connection),
          message: syncMessage(result.outcome),
          accounts: { updated: result.outcome.updated, skipped: result.outcome.skipped },
        };
      case "needs_reconnect":
        return {
          success: false,
          connection: toPublicConnection(result.connection),
          error:
            "This bank connection needs to be reconnected. Please reconnect it to resume syncing.",
        };
      default:
        // Provider error text is logged, not returned: it can echo credentials or internals.
        return {
          success: false,
          connection: toPublicConnection(result.connection),
          error: "Sync failed. Please try again, or reconnect the bank if it keeps failing.",
        };
    }
  }

  /**
   * One sync of one connection (BE-12): the lease, the token (refreshed under a row lock), the
   * provider read under one deadline, and the account writes in one transaction. Records the
   * connection's resulting status; never throws for a provider failure.
   */
  private async runSync(userId: string, id: string, provider: BankProvider): Promise<SyncResult> {
    const sync = this.bankSync();
    const lease = await sync.claim(id, userId);
    if (!lease) return { kind: "busy" };

    let status: BankConnection["status"] = "error";
    let outcome: SyncOutcome | undefined;
    try {
      const institutionId = (await this.bankConnectionRepository.findOneOrFail({ where: { id } }))
        .institutionId;
      const accessToken = await sync.activeAccessToken(id, provider, {
        clientId: this.oauthConfig(institutionId, "CLIENT_ID"),
        clientSecret: this.oauthConfig(institutionId, "CLIENT_SECRET"),
      });
      const providerAccounts = await provider.fetchAccounts(accessToken, {
        signal: AbortSignal.timeout(SYNC_DEADLINE_MS),
      });
      outcome = await sync.writeAccounts(id, userId, providerAccounts);
      status = outcome.total > 0 && outcome.updated === 0 ? "error" : "connected";
    } catch (err) {
      this.logger.error(`Bank sync failed: ${safeErrorSummary(err)}`);
      status = needsReconnect(err) ? "needs_reconnect" : "error";
    } finally {
      try {
        // Only the status columns are written: the token columns may have just been refreshed.
        await this.bankConnectionRepository.update(
          { id, userId },
          status === "connected" ? { status, lastSyncedAt: new Date() } : { status },
        );
      } catch (err) {
        this.logger.error(`Bank sync status not saved: ${safeErrorSummary(err)}`);
      } finally {
        await sync.release(id, lease);
      }
    }

    // Disconnected while the sync ran: nothing was written, and there is nothing to return.
    const connection = await this.bankConnectionRepository.findOne({ where: { id, userId } });
    if (!connection) throw new NotFoundException("Bank connection not found");
    if (status === "connected" && outcome) return { kind: "ok", connection, outcome };
    return { kind: status === "needs_reconnect" ? "needs_reconnect" : "failed", connection };
  }

  /**
   * Disconnects a bank (audit H10): consent is revoked at the provider first (best effort,
   * outside the transaction), then the connection and everything synced from it are deleted in
   * one transaction. `consentRevoked: false` means the user must remove access in their bank's
   * app.
   */
  async deleteBankConnection(userId: string, id: string) {
    const connection = await this.bankConnectionRepository.findOne({ where: { id, userId } });
    if (!connection) {
      throw new NotFoundException("Bank connection not found");
    }
    const outcome = this.providerRegistry
      ? await revokeConnectionConsent(this.providerRegistry, connection)
      : "no_token";
    // BE-06: the audit row and consent withdrawal commit with the deletion.
    await this.bankSync().deleteConnectionData(connection.id, userId, async (m) => {
      await recordAuditEvent(m, {
        userId,
        action: "bank_connection.disconnected",
        targetId: connection.id,
        metadata: {
          institutionId: connection.institutionId,
          consentRevoked: outcome === "revoked",
        },
      });
      await withdrawConsent(m, { userId, kind: "bank_access", targetId: connection.id });
    });
    return { success: true, consentRevoked: outcome === "revoked" };
  }

  private bankSync(): BankConnectionSync {
    return new BankConnectionSync(this.bankConnectionRepository.manager.connection);
  }

  private oauthConfig(
    institutionId: string,
    key: "CLIENT_ID" | "CLIENT_SECRET",
  ): string | undefined {
    return this.configService?.get<string>(`${institutionId.toUpperCase()}_${key}`) || undefined;
  }

  /** The OAuth redirect URI is required config (audit H3): never a localhost fallback. */
  private redirectUri(institutionId: string): string {
    const specific = this.configService?.get<string>(`${institutionId.toUpperCase()}_REDIRECT_URI`);
    if (specific) return specific;
    const backendUrl = this.configService?.get<string>("BACKEND_URL");
    if (!backendUrl) {
      this.logger.error(`No OAuth redirect URI configured for ${institutionId}`);
      throw new ServiceUnavailableException("Bank connections are not configured on this server.");
    }
    return `${backendUrl.replace(/\/+$/, "")}/bank-connections/callback`;
  }
}

const SYNC_BUSY_MESSAGE = "A sync for this bank connection is already running. Try again shortly.";

const INSTITUTION_NAMES: Record<string, string> = {
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

type SyncResult =
  | { kind: "busy" }
  | { kind: "ok"; connection: BankConnection; outcome: SyncOutcome }
  | { kind: "needs_reconnect" | "failed"; connection: BankConnection };

/** Expired or revoked consent (M13): the user has to reconnect; retrying will not help. */
function needsReconnect(err: unknown): boolean {
  return (
    err instanceof ConnectionNeedsReconnectError ||
    (isBankProviderError(err) && err.code === "AUTH_EXPIRED")
  );
}

function syncMessage(outcome: SyncOutcome): string {
  const noun = outcome.total === 1 ? "account" : "accounts";
  if (outcome.skipped === 0) return `Synced ${outcome.updated} ${noun}.`;
  return `Updated ${outcome.updated} of ${outcome.total} ${noun}. The rest could not be read from the bank this time.`;
}
