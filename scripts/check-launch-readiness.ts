/**
 * Launch-readiness checklist (E24-T10). Report mode always exits 0, even on an internal error.
 * --strict (or FLUMP_LAUNCH=true) exits 1 on any failing or unattested item, or on an error.
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

const strict = isStrict(process.argv.slice(2), process.env);

try {
  const root = resolve(import.meta.dir, "..");
  const results = evaluateAll(loadReadiness(root), defaultContext(root));
  console.log(process.argv.includes("--markdown") ? renderMarkdown(results) : renderText(results));
  process.exit(exitCodeFor(results, strict));
} catch (error) {
  console.error(
    `Launch-readiness check crashed: ${error instanceof Error ? error.message : error}`,
  );
  process.exit(strict ? 1 : 0);
}
