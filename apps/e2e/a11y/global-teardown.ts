import { writeFileSync } from "node:fs";
import { VISUAL_ROUTES } from "../visual/routes";
import { compareFindings, mergeBaseline, serializeBaseline, totalsByCheck } from "./baseline";
import {
  BASELINE_PATH,
  GENERATED_BASELINE_PATH,
  readBaseline,
  readFragments,
  recordOnly,
  UPDATE_HINT,
} from "./store";

/**
 * Merges this run's findings into a baseline. It is always written to the results folder (CI
 * uploads it); it replaces the committed baseline in update mode or when none was generated
 * yet. Prints what improved, so a stale baseline is visible without failing anyone's PR.
 */
export default async function globalTeardown(): Promise<void> {
  const fragments = readFragments();
  if (fragments.length === 0) return;
  const previous = readBaseline();
  const next = mergeBaseline(previous, fragments, new Set(VISUAL_ROUTES.map((r) => r.name)));
  const text = serializeBaseline(next);
  writeFileSync(GENERATED_BASELINE_PATH, text);

  const totals = Object.entries(totalsByCheck(next))
    .map(([check, n]) => `${check} ${n}`)
    .join(", ");
  console.log(`\n[a11y] findings this run: ${totals || "none"}`);

  if (recordOnly(previous)) {
    writeFileSync(BASELINE_PATH, text);
    console.log(`[a11y] wrote the baseline to ${BASELINE_PATH}`);
    return;
  }

  const improvements = fragments.flatMap(
    ({ route, project, findings }) =>
      compareFindings(`${route} [${project}]`, findings, previous.routes[route]?.[project])
        .improvements,
  );
  if (improvements.length) {
    console.log(`[a11y] ${improvements.length} improvement(s) on the baseline:`);
    for (const line of improvements) console.log(`  IMPROVED ${line}`);
    console.log(`[a11y] Lock them in: ${UPDATE_HINT}`);
  }
  console.log(`[a11y] generated baseline: ${GENERATED_BASELINE_PATH}`);
}
