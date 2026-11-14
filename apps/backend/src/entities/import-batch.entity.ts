import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

/** Lifecycle of a staged import (E17 re-plan PR C). Only `staged` batches are open. */
export const IMPORT_BATCH_STATUSES = ["staged", "committed", "reverted", "expired"] as const;
export type ImportBatchStatus = (typeof IMPORT_BATCH_STATUSES)[number];

/** One staged account. `ref` is the caller's own id for it, never a Flump id. */
export interface StagedAccount {
  ref: string;
  name: string;
  type: string;
  details?: {
    interestRate?: number;
    monthlyContribution?: number;
    termMonths?: number;
    fixedRateEndDate?: string;
  };
}

/** One staged monthly value, keyed by account ref and "YYYY-MM". Sign as sent. */
export interface StagedBalance {
  accountRef: string;
  month: string;
  value: number;
}

export interface ImportPayload {
  accounts: StagedAccount[];
  balances: StagedBalance[];
  /** Idempotency keys of the chunks appended after the first (the first is `idempotency_key`). */
  chunkKeys: string[];
}

export interface ImportCounts {
  new: number;
  overwrite: number;
  unchanged: number;
  errors: number;
}

/** A row the commit wrote, with what was there before, so revert can put it back. */
export interface RevertRow {
  accountId: string;
  year: number;
  month: number;
  /** The value the commit stored (signed), the ownership check on revert. */
  written: number;
  prior: { value: number; asOfDate: string; source: string; importBatchId: string | null } | null;
}

export interface RevertData {
  rows: RevertRow[];
  /** Accounts the commit created (ref null in the map). */
  createdAccountIds: string[];
  /** Current-month balance moves: the balance before and the one the commit set. */
  balances: Array<{ accountId: string; prior: number; written: number }>;
  /** Row keys (`ref:YYYY-MM`) skipped because they would overwrite a non-agent value. */
  skippedManual: string[];
  /** Set by revert. */
  result?: { restored: number; removed: number; kept: number };
}

/**
 * A staged spreadsheet import (E17 re-plan sections 6 and 7). Staging touches nothing live; a
 * commit under a web session writes `payload` into `account_details` in one transaction and keeps
 * the prior values in `revert_data` for the batch-level undo.
 */
@Entity("import_batches")
@Index("UQ_import_batches_user_idempotency_key", ["userId", "idempotencyKey"], { unique: true })
@Index("IDX_import_batches_user_status", ["userId", "status"])
@Check("CHK_import_batches_status", `"status" IN ('staged', 'committed', 'reverted', 'expired')`)
export class ImportBatch {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "user_id" })
  userId: string;

  @Column({ type: "varchar", default: "staged" })
  status: ImportBatchStatus;

  @Column({ name: "idempotency_key" })
  idempotencyKey: string;

  @Column({ type: "jsonb" })
  payload: ImportPayload;

  @Column({ type: "jsonb" })
  counts: ImportCounts;

  @Column({ name: "revert_data", type: "jsonb", nullable: true })
  revertData: RevertData | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;

  @Column({ name: "committed_at", type: "timestamp", nullable: true })
  committedAt: Date | null;

  @Column({ name: "reverted_at", type: "timestamp", nullable: true })
  revertedAt: Date | null;

  @Column({ name: "expires_at", type: "timestamp" })
  expiresAt: Date;
}
