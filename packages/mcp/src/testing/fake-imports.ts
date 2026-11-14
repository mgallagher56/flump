import { randomUUID } from "node:crypto";
import { WRITE_STAGE_SCOPE } from "../auth/scopes.js";
import type { VerifiedToken } from "../auth/token-verifier.js";
import { FlumpToolError } from "../errors.js";
import { MAX_IMPORT_ROWS } from "../tools/write/common.js";
import type { McpImportBatch, McpImportProvider, McpStageImportInput } from "../types.js";

export const FAKE_MAX_OPEN_BATCHES = 3;
/** A committed batch every fake starts with, owned by `TEST_TOKEN`'s user. */
export const SEEDED_BATCH_ID = "6f1c2b8e-4a3d-4e5f-9a7b-1c2d3e4f5a6b";
export const SEEDED_BATCH_USER = "user_test";
export const FAKE_STAGE_CALLS_PER_HOUR = 30;

interface FakeBatch {
  view: McpImportBatch;
  userId: string;
  keys: Set<string>;
  /** Accounts by ref, keeping the name the caller sent so tests can prove it arrived as data. */
  accounts: Map<string, string>;
  balances: Map<string, number>;
}

export type FakeImports = McpImportProvider & {
  /** Every stage payload, as the tool sent it. */
  staged: Array<{ userId: string; input: McpStageImportInput }>;
  batches: Map<string, FakeBatch>;
  /** Test hook: mark a batch committed, as the web review would. */
  commit(batchId: string): void;
};

/**
 * In-memory double of the backend import adapter: the same scope check, idempotency, row cap,
 * open-batch cap and stage rate limit, as `FlumpToolError`s. The real mapping from the backend's
 * HTTP exceptions is tested in apps/backend.
 */
export function createFakeImports(now: () => Date = () => new Date()): FakeImports {
  const batches = new Map<string, FakeBatch>();
  const byKey = new Map<string, string>();
  const calls = new Map<string, number[]>();
  const staged: FakeImports["staged"] = [];

  const requireScope = (token: VerifiedToken) => {
    if (!token.scopes.includes(WRITE_STAGE_SCOPE)) {
      throw new FlumpToolError("INSUFFICIENT_SCOPE", "This token does not allow staging.");
    }
  };

  const rows = (b: FakeBatch) => b.accounts.size + b.balances.size;
  const refresh = (b: FakeBatch) => {
    b.view.rows = rows(b);
    b.view.counts.staged = b.balances.size;
  };

  batches.set(SEEDED_BATCH_ID, {
    userId: SEEDED_BATCH_USER,
    keys: new Set(["seeded-key-0001"]),
    accounts: new Map([["acc1", "Seeded account"]]),
    balances: new Map([["acc1:2026-01", 100]]),
    view: {
      batchId: SEEDED_BATCH_ID,
      status: "committed",
      reviewUrl: `https://flump.test/app/imports/${SEEDED_BATCH_ID}`,
      rows: 2,
      counts: { staged: 1, new: 1, overwrite: 0, unchanged: 0, skipped: 0, errors: 0 },
      validationErrors: [],
      createdAt: "2026-10-01T09:00:00.000Z",
      expiresAt: "2026-10-08T09:00:00.000Z",
      committedAt: "2026-10-01T10:00:00.000Z",
      revertedAt: null,
    },
  });

  return {
    staged,
    batches,
    commit(batchId) {
      const b = batches.get(batchId);
      if (!b) return;
      b.view.status = "committed";
      b.view.committedAt = now().toISOString();
      b.view.counts = {
        ...b.view.counts,
        new: b.balances.size,
        overwrite: 0,
        unchanged: 0,
        skipped: 0,
      };
    },

    async stageImport(token, input) {
      requireScope(token);
      const t = now().getTime();
      const recent = (calls.get(token.userId) ?? []).filter((c) => c > t - 3_600_000);
      if (recent.length >= FAKE_STAGE_CALLS_PER_HOUR) {
        throw new FlumpToolError("RATE_LIMITED", "Too many staging calls.", {
          retryAfterSeconds: 60,
        });
      }
      calls.set(token.userId, [...recent, t]);
      staged.push({ userId: token.userId, input });

      const replay = byKey.get(`${token.userId}|${input.idempotencyKey}`);
      if (replay) {
        if (input.batchId && input.batchId !== replay) {
          throw new FlumpToolError("CONFLICT", "idempotencyKey belongs to another import.");
        }
        return structuredClone((batches.get(replay) as FakeBatch).view);
      }

      let batch: FakeBatch;
      if (input.batchId) {
        const found = batches.get(input.batchId);
        if (!found || found.userId !== token.userId) {
          throw new FlumpToolError("NOT_FOUND", "Import not found.");
        }
        if (found.view.status !== "staged") {
          throw new FlumpToolError("CONFLICT", "Import is not open.");
        }
        batch = found;
      } else {
        const open = [...batches.values()].filter(
          (b) => b.userId === token.userId && b.view.status === "staged",
        );
        if (open.length >= FAKE_MAX_OPEN_BATCHES) {
          throw new FlumpToolError(
            "LIMIT_EXCEEDED",
            `At most ${FAKE_MAX_OPEN_BATCHES} open imports.`,
          );
        }
        const id = randomUUID();
        batch = {
          userId: token.userId,
          keys: new Set(),
          accounts: new Map(),
          balances: new Map(),
          view: {
            batchId: id,
            status: "staged",
            reviewUrl: `https://flump.test/app/imports/${id}`,
            rows: 0,
            counts: {
              staged: 0,
              new: null,
              overwrite: null,
              unchanged: null,
              skipped: null,
              errors: 0,
            },
            validationErrors: [],
            createdAt: now().toISOString(),
            expiresAt: new Date(t + 7 * 86_400_000).toISOString(),
            committedAt: null,
            revertedAt: null,
          },
        };
      }

      const accounts = new Map(batch.accounts);
      const balances = new Map(batch.balances);
      for (const a of input.accounts) accounts.set(a.ref, a.name);
      const errors: McpImportBatch["validationErrors"] = [];
      for (const b of input.balances) {
        if (!accounts.has(b.accountRef)) {
          errors.push({ ref: b.accountRef, month: b.month, code: "unknown_account_ref" });
          continue;
        }
        balances.set(`${b.accountRef}:${b.month}`, b.value);
      }
      if (accounts.size + balances.size > MAX_IMPORT_ROWS) {
        throw new FlumpToolError("LIMIT_EXCEEDED", `At most ${MAX_IMPORT_ROWS} rows per import.`);
      }

      batch.accounts = accounts;
      batch.balances = balances;
      batch.keys.add(input.idempotencyKey);
      batch.view.validationErrors = errors;
      batch.view.counts.errors += errors.length;
      refresh(batch);
      batches.set(batch.view.batchId, batch);
      byKey.set(`${token.userId}|${input.idempotencyKey}`, batch.view.batchId);
      return structuredClone(batch.view);
    },

    async getImportStatus(token, batchId) {
      requireScope(token);
      const found = batches.get(batchId);
      if (!found || found.userId !== token.userId) {
        throw new FlumpToolError("NOT_FOUND", "Import not found.");
      }
      return { ...structuredClone(found.view), validationErrors: [] };
    },
  };
}
