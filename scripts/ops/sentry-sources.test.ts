import { expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Sentry logs, metrics and span APIs have no beforeSend-style hook in this setup (there is no
// beforeSendLog), and setUser/setContext/setTag/setExtra attach data the scrubbers never see
// coming. None of them may be called. captureException with a `tags` option (the request id in
// apps/backend/src/observability/sentry.ts) is the only enrichment in use and is not matched here.
// One reviewed exception (BE-07): the per-request server span in that file. Transactions do have
// a hook, beforeSendTransaction rebuilds them from an allow-list there, and
// apps/backend/test/observability/sentry-trace-envelope.spec.ts checks the envelope on the wire.
const ALLOWED: Record<string, readonly string[]> = {
  "apps/backend/src/observability/sentry.ts": ["Sentry.startSpanManual"],
};
const NAMES =
  "logger|metrics|startSpan|startSpanManual|startInactiveSpan|setUser|setContext|setTag|setTags|setExtra|setExtras|captureConsoleIntegration|consoleLoggingIntegration";
// `Sentry.<name>` (or `sentry.<name>`), or a named import of one of them from an @sentry package.
const FORBIDDEN = new RegExp(
  `\\b[Ss]entry\\.(?:${NAMES})\\b|import\\s*\\{[^}]*\\b(?:${NAMES})\\b[^}]*\\}\\s*from\\s*["']@sentry/`,
);

const root = new URL("../../", import.meta.url).pathname;
const SKIP_DIRS = new Set(["node_modules", "dist", "build", ".react-router", "coverage", ".turbo"]);
const TEST_FILE = /\.(test|spec|stories)\.(ts|tsx)$/;

function sources(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) out.push(...sources(join(dir, entry.name)));
    } else if (/\.(ts|tsx)$/.test(entry.name) && !TEST_FILE.test(entry.name)) {
      out.push(join(dir, entry.name));
    }
  }
  return out;
}

const strip = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

test("no source file calls the Sentry logs, metrics, span or scope-data APIs", () => {
  const offenders: string[] = [];
  let sentryFiles = 0;
  for (const top of ["apps", "packages"]) {
    for (const file of sources(join(root, top))) {
      const code = strip(readFileSync(file, "utf8"));
      if (!/@sentry\//.test(code)) continue;
      sentryFiles += 1;
      const rel = file.slice(root.length);
      const allowed = ALLOWED[rel] ?? [];
      for (const hit of code.matchAll(new RegExp(FORBIDDEN.source, "g"))) {
        if (!allowed.includes(hit[0])) offenders.push(`${rel}: ${hit[0]}`);
      }
    }
  }
  // Positive control: the scan does see the Sentry modules.
  expect(sentryFiles).toBeGreaterThanOrEqual(3);
  expect(offenders).toEqual([]);
});

test("the forbidden-name pattern matches the calls it is meant to catch", () => {
  for (const call of [
    "Sentry.logger.info(x)",
    "Sentry.setUser({})",
    "Sentry.metrics.count(1)",
    'import { setTag } from "@sentry/node"',
  ]) {
    expect(FORBIDDEN.test(call)).toBe(true);
  }
  expect(FORBIDDEN.test("Sentry.captureException(e, { tags: { request_id: id } })")).toBe(false);
});
