/** Illustrative import fixtures for stories and tests. Example figures only; no real data. */
import type {
  ExistingAccount,
  ImportBatch,
  ImportPreview,
  PreviewAccount,
  PreviewRow,
} from "./importModel";

export const BATCH_ID = "b0000000-0000-4000-8000-000000000001";

export const EXISTING_ACCOUNTS: ExistingAccount[] = [
  { id: "a0000000-0000-4000-8000-000000000001", name: "Current account", type: "Current" },
  { id: "a0000000-0000-4000-8000-000000000002", name: "Easy access saver", type: "Saving" },
  { id: "a0000000-0000-4000-8000-000000000003", name: "Mortgage", type: "Mortgage" },
];

export const PREVIEW_ACCOUNTS: PreviewAccount[] = [
  {
    ref: "saver",
    name: "Easy access saver",
    type: "Saving",
    mappedAccountId: "a0000000-0000-4000-8000-000000000002",
    suggestedAccountId: "a0000000-0000-4000-8000-000000000002",
  },
  {
    ref: "isa",
    name: "Stocks ISA",
    type: "Investment",
    mappedAccountId: null,
    suggestedAccountId: null,
  },
];

const row = (r: Partial<PreviewRow> & Pick<PreviewRow, "ref" | "month" | "value">): PreviewRow => ({
  key: `${r.ref}:${r.month}`,
  prior: null,
  priorSource: null,
  status: "new",
  needsTick: false,
  ...r,
});

export const PREVIEW_ROWS: PreviewRow[] = [
  row({
    ref: "saver",
    month: "2026-08",
    value: 4200,
    prior: 4200,
    priorSource: "manual",
    status: "unchanged",
  }),
  row({
    ref: "saver",
    month: "2026-09",
    value: 4350,
    prior: 4300,
    priorSource: "manual",
    status: "overwrite",
    needsTick: true,
  }),
  row({
    ref: "saver",
    month: "2026-10",
    value: 4500,
    prior: 4480,
    priorSource: "agent",
    status: "overwrite",
  }),
  row({ ref: "isa", month: "2026-08", value: 11800 }),
  row({ ref: "isa", month: "2026-09", value: 12150 }),
  row({ ref: "isa", month: "2026-10", value: 12020 }),
];

export const PREVIEW: ImportPreview = {
  batchId: BATCH_ID,
  status: "staged",
  expiresAt: "2026-11-20T10:00:00.000Z",
  accounts: PREVIEW_ACCOUNTS,
  rows: PREVIEW_ROWS,
  totals: { new: 3, overwrite: 2, unchanged: 1, needsTick: 1, errors: 0 },
};

/** Twelve months for two accounts: enough rows to put the table in a drawer. */
export const LONG_PREVIEW: ImportPreview = {
  ...PREVIEW,
  rows: Array.from({ length: 12 }, (_, i) => {
    const month = `2025-${String(i + 1).padStart(2, "0")}`;
    return [
      row({ ref: "saver", month, value: 3000 + i * 100 }),
      row({ ref: "isa", month, value: 9000 + i * 250 }),
    ];
  }).flat(),
  totals: { new: 24, overwrite: 0, unchanged: 0, needsTick: 0, errors: 0 },
};

const base: ImportBatch = {
  batchId: BATCH_ID,
  status: "staged",
  counts: { staged: 6, new: null, overwrite: null, unchanged: null, skipped: null, errors: 0 },
  rows: 8,
  skippedManual: [],
  revert: null,
  createdAt: "2026-11-13T10:00:00.000Z",
  expiresAt: "2026-11-20T10:00:00.000Z",
  committedAt: null,
  revertedAt: null,
};

export const STAGED_BATCH = base;

export const COMMITTED_BATCH: ImportBatch = {
  ...base,
  status: "committed",
  counts: { staged: 6, new: 3, overwrite: 1, unchanged: 1, skipped: 1, errors: 0 },
  skippedManual: ["saver:2026-09"],
  committedAt: "2026-11-13T10:05:00.000Z",
};

export const REVERTED_BATCH: ImportBatch = {
  ...COMMITTED_BATCH,
  status: "reverted",
  revert: { restored: 1, removed: 3, kept: 0 },
  revertedAt: "2026-11-13T10:10:00.000Z",
};

export const EXPIRED_BATCH: ImportBatch = { ...base, status: "expired" };

export const BATCH_LIST: ImportBatch[] = [
  {
    ...STAGED_BATCH,
    batchId: "b0000000-0000-4000-8000-000000000004",
    createdAt: "2026-11-14T09:00:00.000Z",
  },
  COMMITTED_BATCH,
  { ...REVERTED_BATCH, batchId: "b0000000-0000-4000-8000-000000000002" },
  {
    ...EXPIRED_BATCH,
    batchId: "b0000000-0000-4000-8000-000000000003",
    createdAt: "2026-11-01T09:00:00.000Z",
  },
];
