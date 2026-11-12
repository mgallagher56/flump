/**
 * Launch-readiness checklist (E24-T10). Report mode always exits 0.
 * --strict (or FLUMP_LAUNCH=true) exits 1 on any failing or unattested item.
 * --markdown prints a table. Items: docs/launch/readiness.json.
 */
import { resolve } from "node:path";
import {
  defaultContext,
  evaluateAll,
  exitCodeFor,
  isStrict,
  loadReadiness,
  renderMarkdown,
  renderText,
} from "./lib/launch-readiness";

const root = resolve(import.meta.dir, "..");
const results = evaluateAll(loadReadiness(root), defaultContext(root));
const strict = isStrict(process.argv.slice(2), process.env);

console.log(process.argv.includes("--markdown") ? renderMarkdown(results) : renderText(results));
process.exit(exitCodeFor(results, strict));
