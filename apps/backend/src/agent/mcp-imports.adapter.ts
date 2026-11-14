import { StageImportRequest } from "@flump/api-contract";
import {
  FlumpToolError,
  type McpImportBatch,
  type McpImportProvider,
  type McpStageImportInput,
  type VerifiedToken,
  WRITE_STAGE_SCOPE,
} from "@flump/mcp";
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { StagedAccount } from "../entities/import-batch.entity";
import { type ImportBatchView, ImportsService } from "../imports/imports.service";
import { importReviewUrl } from "../imports/review-url";
import { isMcpUserAllowed, readMcpAccessConfig } from "../mcp-access";
import { RATE_LIMIT_POLICIES } from "../security/rate-limit.decorator";
import { RateLimitStore } from "../security/rate-limit.store";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Cap messages from ImportsService ("At most N ... per import", "At most N open imports"). */
const CAP_MESSAGE = /^At most \d+ /;

/**
 * The MCP side of the import pipeline (E17 re-plan PR D). MCP tool calls land in this process
 * (McpService runs the MCP handler), so this is where `write:stage` is enforced server-side: the
 * token is checked here again, whatever the tool layer did. It applies the same rules as
 * POST /imports and GET /imports/:id: the imports allowlist, the contract schema, the `importStage`
 * rate limit (one shared per-user budget with the REST route; a replayed key is not charged), then
 * ImportsService. It has
 * no commit, revert or delete: those need a web session.
 */
@Injectable()
export class McpImportsAdapter implements McpImportProvider {
  constructor(
    private readonly imports: ImportsService,
    @Inject(RateLimitStore) private readonly rateLimits: RateLimitStore,
  ) {}

  async stageImport(token: VerifiedToken, input: McpStageImportInput): Promise<McpImportBatch> {
    this.authorize(token);
    const parsed = StageImportRequest.safeParse(input);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      // The path and the schema's own message only; never the offending value.
      throw new FlumpToolError("INVALID_ARGUMENT", issue?.message ?? "Invalid import rows.", {
        hint: "Check the input schema and try again.",
        ...(issue?.path.length ? { field: issue.path.join(".") } : {}),
      });
    }
    // A retry with a key already staged is a replay: it adds nothing, so it does not spend the
    // hourly budget (a client retrying after a timeout must not lock itself out).
    if (!(await this.imports.isReplay(token.userId, parsed.data.idempotencyKey))) {
      const decision = this.rateLimits.hit(
        `user:${token.userId}:importStage`,
        RATE_LIMIT_POLICIES.importStage,
      );
      if (!decision.allowed) {
        throw new FlumpToolError("RATE_LIMITED", "Too many staging calls this hour.", {
          hint: "Wait, then resend the same chunk with the same idempotencyKey.",
          retryAfterSeconds: decision.retryAfterSeconds,
        });
      }
    }
    const body = parsed.data;
    const view = await this.run(() =>
      this.imports.stage(token.userId, {
        ...(body.batchId ? { batchId: body.batchId } : {}),
        idempotencyKey: body.idempotencyKey,
        accounts: body.accounts as StagedAccount[],
        balances: body.balances,
      }),
    );
    return toMcpBatch(view);
  }

  async getImportStatus(token: VerifiedToken, batchId: string): Promise<McpImportBatch> {
    this.authorize(token);
    if (!UUID.test(batchId)) throw notFound();
    return toMcpBatch(await this.run(() => this.imports.get(token.userId, batchId)));
  }

  /** Server-side scope check, plus the same owner-only rollout gate as ImportsAccessGuard. */
  private authorize(token: VerifiedToken): void {
    if (!token.scopes.includes(WRITE_STAGE_SCOPE)) {
      throw new FlumpToolError(
        "INSUFFICIENT_SCOPE",
        `Staging needs the ${WRITE_STAGE_SCOPE} scope.`,
        {
          hint: "Create a token that allows staging in Flump settings.",
        },
      );
    }
    if (!isMcpUserAllowed(readMcpAccessConfig(process.env), token.userId)) throw notFound();
  }

  /** Maps ImportsService's HTTP exceptions to tool errors. Their messages are fixed strings. */
  private async run<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      if (err instanceof NotFoundException) throw notFound();
      const message = err instanceof Error ? err.message : "";
      if (err instanceof BadRequestException || err instanceof ConflictException) {
        if (CAP_MESSAGE.test(message)) {
          throw new FlumpToolError("LIMIT_EXCEEDED", `${message}.`, {
            hint: "Stage fewer rows per batch, or ask the user to commit or let an open import expire.",
          });
        }
        if (err instanceof ConflictException) {
          throw new FlumpToolError("CONFLICT", `${message}.`, {
            hint: "Start a new batch (omit batchId) with a new idempotencyKey.",
          });
        }
        throw new FlumpToolError("INVALID_ARGUMENT", `${message}.`, {
          hint: "Check the input schema and try again.",
        });
      }
      throw err;
    }
  }
}

const notFound = () =>
  new FlumpToolError("NOT_FOUND", "Import not found.", {
    hint: "Use a batchId returned by stage_import for this user.",
  });

/** Copies listed fields only: the view never holds names or values, and neither does this. */
export function toMcpBatch(view: ImportBatchView): McpImportBatch {
  return {
    batchId: view.batchId,
    status: view.status,
    reviewUrl: importReviewUrl(view.batchId),
    rows: view.rows,
    counts: {
      staged: view.counts.staged,
      new: view.counts.new,
      overwrite: view.counts.overwrite,
      unchanged: view.counts.unchanged,
      skipped: view.counts.skipped,
      errors: view.counts.errors,
    },
    validationErrors: view.validationErrors.map((e) => ({
      ref: e.ref,
      ...(e.month ? { month: e.month } : {}),
      code: e.code,
    })),
    createdAt: view.createdAt,
    expiresAt: view.expiresAt,
    committedAt: view.committedAt,
    revertedAt: view.revertedAt,
  };
}
