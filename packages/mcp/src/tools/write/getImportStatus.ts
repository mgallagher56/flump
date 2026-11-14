import { MCP_NOTICE } from "@flump/finance-engine";
import { defineFlumpTool } from "../../define-tool.js";
import { batchIdSchema, importBatchResult, requireImports, toBatchResult } from "./common.js";

/** Reads back one of the user's import batches (E17 re-plan PR D). Refs and counts only. */
export const getImportStatus = defineFlumpTool({
  name: "get_import_status",
  title: "Import status",
  description:
    "The status of an import batch staged with stage_import: staged (waiting for the user to review and commit it in Flump), committed (the user committed it, with counts of rows written, unchanged and skipped), reverted (the user undid it) or expired (never committed; nothing was saved). Use it after sending the user to reviewUrl. It cannot commit anything.",
  input: {
    batchId: batchIdSchema.describe("The batchId returned by stage_import"),
  },
  result: importBatchResult,
  async handler({ batchId }, ctx) {
    const batch = await requireImports(ctx).getImportStatus(ctx.token, batchId);
    return {
      result: toBatchResult(batch),
      provenance: { batch: "import_batches" },
      notice: MCP_NOTICE,
    };
  },
});
