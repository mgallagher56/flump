import { describe, expect, it } from "vitest";
import {
  CommitImportRequest,
  ImportBatchResponse,
  MAX_IMPORT_ROWS,
  StageImportRequest,
} from "./domains/imports.js";
import { allRoutes } from "./manifest.js";
import { checkAgainst } from "./validate.js";

const BATCH = "6f1c6a4e-5b0e-4a63-9d0a-3f2f2a9d1c11";

const stage = {
  idempotencyKey: "sheet-2026-11-a",
  accounts: [{ ref: "acc_1", name: "Easy saver", type: "Saving" }],
  balances: [{ accountRef: "acc_1", month: "2026-01", value: 1200.5 }],
};

const view = {
  batchId: BATCH,
  status: "staged",
  counts: { new: 1, overwrite: 0, unchanged: 0, errors: 0 },
  rows: 2,
  validationErrors: [{ ref: "acc_1", month: "2099-01", code: "future_month" }],
  skippedManual: [],
  revert: null,
  createdAt: "2026-11-14T10:00:00.000Z",
  expiresAt: "2026-11-21T10:00:00.000Z",
  committedAt: null,
  revertedAt: null,
};

describe("import contract (E17 PR C)", () => {
  it("registers four session-auth routes with request and response schemas", () => {
    const ids = allRoutes.filter((r) => r.group === "imports").map((r) => r.id);
    expect(ids.sort()).toEqual([
      "imports.commit",
      "imports.get",
      "imports.revert",
      "imports.stage",
    ]);
    for (const r of allRoutes.filter((x) => x.group === "imports")) {
      expect(r.auth).toBe("user");
      expect(r.response).toBe(ImportBatchResponse);
    }
  });

  it("accepts a stage chunk and rejects bad refs, keys, months, values and oversized arrays", () => {
    expect(checkAgainst(StageImportRequest, stage).ok).toBe(true);
    expect(checkAgainst(StageImportRequest, { ...stage, batchId: BATCH }).ok).toBe(true);
    expect(checkAgainst(StageImportRequest, { ...stage, idempotencyKey: "short" }).ok).toBe(false);
    const badRef = { ...stage, accounts: [{ ...stage.accounts[0], ref: "has space" }] };
    expect(checkAgainst(StageImportRequest, badRef).ok).toBe(false);
    const badMonth = { ...stage, balances: [{ ...stage.balances[0], month: "2026-13" }] };
    expect(checkAgainst(StageImportRequest, badMonth).ok).toBe(false);
    const badValue = { ...stage, balances: [{ ...stage.balances[0], value: 1.005 }] };
    expect(checkAgainst(StageImportRequest, badValue).ok).toBe(false);
    const many = Array.from({ length: MAX_IMPORT_ROWS + 1 }, () => stage.balances[0]);
    expect(checkAgainst(StageImportRequest, { ...stage, balances: many }).ok).toBe(false);
  });

  it("validates the commit options", () => {
    expect(checkAgainst(CommitImportRequest, {}).ok).toBe(true);
    expect(
      checkAgainst(CommitImportRequest, {
        accountMap: { acc_1: BATCH, acc_2: null },
        overwriteManual: ["acc_1:2026-01"],
      }).ok,
    ).toBe(true);
    expect(checkAgainst(CommitImportRequest, { accountMap: { acc_1: "nope" } }).ok).toBe(false);
    expect(checkAgainst(CommitImportRequest, { overwriteManual: ["acc_1"] }).ok).toBe(false);
  });

  it("describes the batch view and never allows names or values in it", () => {
    expect(checkAgainst(ImportBatchResponse, view).ok).toBe(true);
    expect(checkAgainst(ImportBatchResponse, { ...view, name: "Easy saver" }).ok).toBe(false);
    const withValue = { ...view, validationErrors: [{ ...view.validationErrors[0], value: 1 }] };
    expect(checkAgainst(ImportBatchResponse, withValue).ok).toBe(false);
    expect(checkAgainst(ImportBatchResponse, { ...view, status: "pending" }).ok).toBe(false);
  });
});
