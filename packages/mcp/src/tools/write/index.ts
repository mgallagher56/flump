import type { DefinedFlumpTool } from "../../define-tool.js";
import { getImportStatus } from "./getImportStatus.js";
import { stageImport } from "./stageImport.js";

/**
 * Write tools (E17 re-plan PR D), behind the opt-in `write:stage` scope. They stage and read back
 * an import batch; there is deliberately no tool that commits, reverts or deletes.
 */
export const WRITE_TOOLS: readonly DefinedFlumpTool[] = [stageImport, getImportStatus];
