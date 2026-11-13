import { randomBytes } from "node:crypto";
import {
  type BuildContextPackInput,
  buildFlumpAiContextPack,
  formatAiContextPackMarkdown,
  userProfileToFinancialBaseline,
} from "@flump/finance-engine";
import {
  HttpMcpHandler,
  hashPatToken,
  type McpTokenRecord,
  type McpTokenStoreAdapter,
  type McpUserDataProvider,
} from "@flump/mcp";
import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Between, In, LessThanOrEqual, MoreThanOrEqual, Repository } from "typeorm";
import { AUTH_MODE } from "./auth/auth.module";
import { DEV_BYPASS_TOKEN, DEV_USER } from "./auth/dev-bypass.verifier";
import { Account } from "./entities/account.entity";
import { AccountDetail } from "./entities/account-detail.entity";
import { BudgetEntry } from "./entities/budget-entry.entity";
import { McpToken } from "./entities/mcp-token.entity";
import { TaxRecord } from "./entities/tax-record.entity";
import { Transaction } from "./entities/transaction.entity";
import { UserProfile } from "./entities/user-profile.entity";
import { FinanceService } from "./finance.service";
import {
  isMcpUserAllowed,
  isProductionLike,
  mcpOpenAccessBootWarning,
  readMcpAccessConfig,
} from "./mcp-access";
import { UserProfileService } from "./user-profile.service";

const PAT_EXPIRY_DAYS = [7, 30, 90, 365] as const;
const DEFAULT_PAT_EXPIRY_DAYS = 90;

@Injectable()
export class McpService implements McpTokenStoreAdapter, McpUserDataProvider {
  private readonly logger = new Logger(McpService.name);
  private httpHandler: HttpMcpHandler;

  constructor(
    @InjectRepository(McpToken)
    private readonly mcpTokenRepository: Repository<McpToken>,
    @InjectRepository(UserProfile)
    private readonly userProfileRepository: Repository<UserProfile>,
    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,
    @InjectRepository(AccountDetail)
    private readonly accountDetailRepository: Repository<AccountDetail>,
    @InjectRepository(BudgetEntry)
    private readonly budgetEntryRepository: Repository<BudgetEntry>,
    @InjectRepository(TaxRecord)
    private readonly taxRecordRepository: Repository<TaxRecord>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    private readonly financeService: FinanceService,
    private readonly userProfileService: UserProfileService,
    private readonly configService: ConfigService,
    @Inject(AUTH_MODE) authMode: "workos" | "dev",
  ) {
    const warning = mcpOpenAccessBootWarning(process.env);
    if (warning) this.logger.warn(warning);
    this.httpHandler = new HttpMcpHandler({
      dataProvider: this,
      tokenStore: this,
      // Defence in depth: the dev bypass token is never emitted in a production-like process,
      // even if authMode were somehow "dev" (resolveAuthMode already refuses that at boot).
      ...(authMode === "dev" && !isProductionLike(process.env)
        ? { devToken: DEV_BYPASS_TOKEN, devUserId: DEV_USER.id }
        : {}),
      expectedAudience: this.configService.get<string>("MCP_AUDIENCE") || "flump-mcp",
      authServerUrl: this.configService.get<string>("AUTH_SERVER_URL") || "https://api.workos.com",
    });
  }

  getHttpHandler(): HttpMcpHandler {
    return this.httpHandler;
  }

  // --- McpTokenStoreAdapter implementation ---

  async findTokenByHash(tokenHash: string): Promise<McpTokenRecord | null> {
    const found = await this.mcpTokenRepository.findOne({ where: { tokenHash } });
    if (!found) return null;
    // E29-T8: a token is unusable while the kill switch is on, or when its owner is not
    // allowlisted and MCP is not open. Listing and revoking tokens stays ungated on purpose so
    // users can revoke during an outage. The /mcp handlers are gated by E20-N18, not here.
    const access = readMcpAccessConfig(process.env);
    if (!access.enabled) return null;
    if (!isMcpUserAllowed(access, found.userId)) {
      this.logger.warn(`mcp_token_denied tokenId=${found.id} userId=${found.userId}`);
      return null;
    }
    return {
      id: found.id,
      userId: found.userId,
      tokenHash: found.tokenHash,
      scopes: found.scopes,
      anonymizeInstitutions: found.anonymizeInstitutions,
      expiresAt: found.expiresAt,
      revokedAt: found.revokedAt,
    };
  }

  async recordRequest(tokenId: string, toolCalls: number): Promise<void> {
    await this.mcpTokenRepository
      .createQueryBuilder()
      .update(McpToken)
      .set({
        totalToolCalls: () => "total_tool_calls + :n",
        lastUsedAt: () => "now()",
      })
      .where("id = :id", { id: tokenId })
      .setParameter("n", toolCalls)
      .execute();
  }

  // --- McpUserDataProvider implementation ---

  async getUserFinancialData(
    userId: string,
    options: { anonymizeInstitutions?: boolean } = {},
  ): Promise<BuildContextPackInput> {
    const profile = await this.userProfileService.getProfile(userId);
    const baseline = userProfileToFinancialBaseline(profile, userId);

    const accounts = await this.financeService.getAccounts(userId);
    const accountDetails = await this.financeService.getAccountDetails(userId);

    const budgetEntries = await this.budgetEntryRepository.find({
      where: { userId },
      order: { createdAt: "ASC" },
    });

    const taxRecords = await this.taxRecordRepository.find({
      where: { userId },
      order: { date: "DESC" },
    });

    return {
      baseline,
      accounts,
      accountDetails,
      budgetEntries: budgetEntries.map((b) => ({
        id: b.id,
        category: b.category,
        name: b.name,
        amount: Number(b.amount) || 0,
        frequency: b.frequency,
        isIncome: b.isIncome,
        isEssential: b.isEssential,
        notes: b.notes,
      })),
      // Receipts (base64 blobs) are never sent to MCP clients (E20-N15/N16).
      taxRecords: taxRecords.map((t) => ({
        id: t.id,
        type: t.type,
        source: t.source,
        category: t.category,
        name: t.name,
        amount: t.amount,
        frequency: t.frequency,
        date: t.date,
        endDate: t.endDate,
        notes: t.notes,
      })) as any,
    };
  }

  async queryTransactions(
    userId: string,
    filters: {
      accountId?: string;
      category?: string;
      startDate?: string;
      endDate?: string;
      limit?: number;
    },
  ) {
    const where: any = { userId };
    if (filters.accountId) where.accountId = filters.accountId;
    if (filters.category) where.category = filters.category;

    if (filters.startDate && filters.endDate) {
      where.timestamp = Between(new Date(filters.startDate), new Date(filters.endDate));
    } else if (filters.startDate) {
      where.timestamp = MoreThanOrEqual(new Date(filters.startDate));
    } else if (filters.endDate) {
      where.timestamp = LessThanOrEqual(new Date(filters.endDate));
    }

    const txs = await this.transactionRepository.find({
      where,
      order: { timestamp: "DESC" },
      take: filters.limit || 30,
    });

    return txs.map((tx) => ({
      id: tx.id,
      accountId: tx.accountId,
      amount: Number(tx.amount) || 0,
      description: tx.description,
      category: tx.category,
      timestamp: tx.timestamp.toISOString(),
    }));
  }

  // --- Token Management CRUD ---

  async createPatToken(
    userId: string,
    name: string,
    options: {
      expiryDays?: number | null;
      anonymizeInstitutions?: boolean;
    } = {},
  ) {
    if (typeof name !== "string") {
      throw new BadRequestException("Token name must be a string.");
    }
    const cleanName = name.normalize("NFC").trim();
    if (/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u.test(cleanName)) {
      throw new BadRequestException("Token name must not contain control or invisible characters.");
    }
    if (cleanName.length < 1 || cleanName.length > 64) {
      throw new BadRequestException("Token name must be 1 to 64 characters.");
    }

    const expiryDays =
      options.expiryDays === undefined ? DEFAULT_PAT_EXPIRY_DAYS : options.expiryDays;
    if (
      typeof expiryDays !== "number" ||
      !(PAT_EXPIRY_DAYS as readonly number[]).includes(expiryDays)
    ) {
      throw new BadRequestException(
        `Token expiry must be one of ${PAT_EXPIRY_DAYS.join(", ")} days. Tokens that never expire are not allowed.`,
      );
    }

    if (
      options.anonymizeInstitutions !== undefined &&
      typeof options.anonymizeInstitutions !== "boolean"
    ) {
      throw new BadRequestException("anonymizeInstitutions must be a boolean.");
    }
    if (options.anonymizeInstitutions === false) {
      throw new BadRequestException(
        "Tokens must anonymise institution names. Revealing them needs step-up verification, which is not available yet.",
      );
    }
    const anonymizeInstitutions = true;

    // Generate 32-hex cryptographically secure PAT
    const randomSecret = randomBytes(16).toString("hex");
    const rawToken = `flump_pat_${randomSecret}`;
    const tokenHash = hashPatToken(rawToken);
    const tokenPrefix = `flump_pat_${randomSecret.slice(0, 4)}...${randomSecret.slice(-4)}`;

    const scopes = ["mcp:read:anonymized", "mcp:simulate"];
    const expiresAt = new Date(Date.now() + expiryDays * 86400 * 1000);

    const token = this.mcpTokenRepository.create({
      userId,
      name: cleanName,
      tokenHash,
      tokenPrefix,
      scopes,
      anonymizeInstitutions,
      expiresAt,
    });

    const saved = await this.mcpTokenRepository.save(token);

    return {
      id: saved.id,
      name: saved.name,
      tokenPrefix: saved.tokenPrefix,
      rawToken, // ONLY returned once upon creation!
      scopes: saved.scopes,
      anonymizeInstitutions: saved.anonymizeInstitutions,
      expiresAt: saved.expiresAt,
      createdAt: saved.createdAt,
    };
  }

  async listTokens(userId: string) {
    const tokens = await this.mcpTokenRepository.find({
      where: { userId },
      order: { createdAt: "DESC" },
    });

    const now = Date.now();

    return tokens.map((tok) => ({
      id: tok.id,
      name: tok.name,
      tokenPrefix: tok.tokenPrefix,
      scopes: tok.scopes,
      anonymizeInstitutions: tok.anonymizeInstitutions,
      expiresAt: tok.expiresAt,
      lastUsedAt: tok.lastUsedAt,
      totalToolCalls: tok.totalToolCalls,
      createdAt: tok.createdAt,
      isRevoked: !!tok.revokedAt,
      isExpired: !!(tok.expiresAt && new Date(tok.expiresAt).getTime() < now),
    }));
  }

  async revokeToken(userId: string, tokenId: string) {
    const token = await this.mcpTokenRepository.findOne({
      where: { id: tokenId, userId },
    });
    if (!token) {
      throw new NotFoundException("AI Connection token not found.");
    }

    token.revokedAt = new Date();
    await this.mcpTokenRepository.save(token);
    return { success: true };
  }

  // --- Context Pack for Offline Exporter ---

  async getContextPack(userId: string, anonymizeInstitutions = true) {
    const rawData = await this.getUserFinancialData(userId, { anonymizeInstitutions });
    const pack = buildFlumpAiContextPack(rawData, { anonymizeInstitutions });
    const markdown = formatAiContextPackMarkdown(pack);
    return {
      pack,
      markdown,
    };
  }
}
