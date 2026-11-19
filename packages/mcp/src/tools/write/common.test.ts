import { afterEach, describe, expect, it } from "vitest";
import { connectTestClient, type TestHarness } from "../../testing/client.js";
import { emptyUser } from "../../testing/personas.js";
import { MCP_IMPORT_STATUSES, type McpImportBatch } from "../../types.js";
import { importMonth, importRef, STAGING_NOTE, toBatchResult } from "./common.js";

const batch = (status: McpImportBatch["status"]): McpImportBatch => ({
  batchId: "6f1c2b8e-4a3d-4e5f-9a7b-000000000001",
  status,
  reviewUrl: "https://flump.test/app/imports/6f1c2b8e-4a3d-4e5f-9a7b-000000000001",
  rows: 2,
  counts: { staged: 1, new: null, overwrite: null, unchanged: null, skipped: null, errors: 0 },
  validationErrors: [],
  createdAt: "2026-10-01T09:00:00.000Z",
  expiresAt: "2026-10-08T09:00:00.000Z",
  committedAt: null,
  revertedAt: null,
});

describe("import batch results", () => {
  it("gives a distinct next step for every batch status", () => {
    const steps = MCP_IMPORT_STATUSES.map((s) => toBatchResult(batch(s)).nextStep);
    expect(steps.every((s) => s.length > 0)).toBe(true);
    expect(new Set(steps).size).toBe(MCP_IMPORT_STATUSES.length);
  });

  it("marks only a committed batch as committed and always carries the staging note", () => {
    for (const s of MCP_IMPORT_STATUSES) {
      const r = toBatchResult(batch(s));
      expect(r.committed, s).toBe(s === "committed");
      expect(r.note).toBe(STAGING_NOTE);
    }
  });
});

describe("import field checks", () => {
  it("says what a ref may contain when it is refused", () => {
    const r = importRef.safeParse("acc 1");
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toContain("1-64");
  });

  it("says a month must be YYYY-MM when it is refused", () => {
    const r = importMonth.safeParse("2026-13");
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toContain("YYYY-MM");
  });
});

describe("staging provider", () => {
  let h: TestHarness | undefined;
  afterEach(async () => {
    await h?.close();
    h = undefined;
  });

  it("tells the agent staging needs the remote connection when there is no provider", async () => {
    h = await connectTestClient(emptyUser, { noImports: true });
    const text = await h.callText("get_import_status", {
      batchId: "6f1c2b8e-4a3d-4e5f-9a7b-1c2d3e4f5a6b",
    });
    const { error } = JSON.parse(text) as { error: { code: string; hint?: string } };
    expect(error.code).toBe("UNAVAILABLE");
    expect(error.hint).toContain("remote");
  });
});
