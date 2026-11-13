import { randomBytes } from "node:crypto";
import { hashPatToken, type McpTokenRecord, type McpTokenStoreAdapter } from "@flump/mcp";
import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { McpToken } from "../entities/mcp-token.entity";
import { isMcpUserAllowed, readMcpAccessConfig } from "../mcp-access";

const PAT_EXPIRY_DAYS = [7, 30, 90, 365] as const;
const DEFAULT_PAT_EXPIRY_DAYS = 90;

/** Token store adapter for the MCP handler, plus personal access token CRUD. */
@Injectable()
export class McpTokenService implements McpTokenStoreAdapter {
  private readonly logger = new Logger(McpTokenService.name);

  constructor(
    @InjectRepository(McpToken)
    private readonly mcpTokenRepository: Repository<McpToken>,
  ) {}

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
}
