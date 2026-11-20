/**
 * Pure helpers for the backend load smoke (backend audit 2026-11, finding M23). No network here,
 * so `bun test ./scripts` covers the guard, the percentile maths and the budget check.
 */

/** Hosts the load smoke may target: this machine only. There is no override. */
const LOOPBACK_HOSTS: ReadonlySet<string> = new Set(["localhost", "127.0.0.1", "[::1]"]);

/** Set by Railway inside every service and build; the smoke refuses to run there at all. */
const RAILWAY_MARKERS = [
  "RAILWAY_ENVIRONMENT",
  "RAILWAY_ENVIRONMENT_NAME",
  "RAILWAY_PROJECT_ID",
  "RAILWAY_SERVICE_ID",
] as const;

/**
 * Returns the target as a URL, or throws. The load smoke only ever runs against a stack on this
 * machine (a developer's own or the CI job's): plain http to a loopback host, with no credentials
 * in the URL. Anything else is refused, whatever the caller says, so it can never be pointed at
 * production, staging or any Railway address.
 */
export function assertLocalTarget(
  raw: string,
  env: Record<string, string | undefined> = process.env,
): URL {
  for (const marker of RAILWAY_MARKERS) {
    if (env[marker]) throw new Error(`load smoke refused: ${marker} is set (running on Railway)`);
  }
  // fetch honours proxy variables, and a proxy would carry the requests off this machine.
  for (const proxy of ["HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY"]) {
    if (env[proxy] || env[proxy.toLowerCase()])
      throw new Error(`load smoke refused: ${proxy} is set, so requests would leave this machine`);
  }
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("load smoke refused: the target is not a URL");
  }
  if (url.protocol !== "http:") {
    throw new Error("load smoke refused: the target must be plain http on this machine");
  }
  if (!LOOPBACK_HOSTS.has(url.hostname)) {
    throw new Error(
      `load smoke refused: host "${url.hostname}" is not local (allowed: localhost, 127.0.0.1, [::1])`,
    );
  }
  if (url.username || url.password) {
    throw new Error("load smoke refused: the target must not carry credentials");
  }
  if (url.pathname !== "/" || url.search || url.hash) {
    throw new Error("load smoke refused: the target must be an origin, with no path or query");
  }
  return url;
}

export interface Sample {
  route: string;
  /** Wall time from sending the request to reading the whole body. */
  ms: number;
  /** HTTP status, or 0 when the request failed before a response (refused, timed out, redirected). */
  status: number;
}

interface RouteStats {
  count: number;
  errors: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  maxMs: number;
}

export interface Summary {
  overall: RouteStats;
  routes: Record<string, RouteStats>;
}

/** Nearest-rank percentile of an ascending list; 0 for an empty one. */
export function percentile(sortedAscending: readonly number[], p: number): number {
  if (sortedAscending.length === 0) return 0;
  const rank = Math.ceil((p / 100) * sortedAscending.length);
  return sortedAscending[Math.min(sortedAscending.length, Math.max(1, rank)) - 1] as number;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

function statsFor(samples: readonly Sample[]): RouteStats {
  const times = samples.map((s) => s.ms).sort((a, b) => a - b);
  return {
    count: samples.length,
    errors: samples.filter((s) => s.status !== 200).length,
    p50Ms: round1(percentile(times, 50)),
    p95Ms: round1(percentile(times, 95)),
    p99Ms: round1(percentile(times, 99)),
    maxMs: round1(times.at(-1) ?? 0),
  };
}

/** Latency and error counts overall and per route. Any status other than 200 is an error. */
export function summarise(samples: readonly Sample[]): Summary {
  const byRoute = new Map<string, Sample[]>();
  for (const sample of samples) {
    byRoute.set(sample.route, [...(byRoute.get(sample.route) ?? []), sample]);
  }
  const routes: Record<string, RouteStats> = {};
  for (const [route, list] of [...byRoute].sort(([a], [b]) => a.localeCompare(b))) {
    routes[route] = statsFor(list);
  }
  return { overall: statsFor(samples), routes };
}

export interface Budget {
  /** The slowest any single route's p95 may be. */
  routeP95Ms: number;
  /** The slowest the p95 across every request may be. */
  overallP95Ms: number;
  /** The slowest the p99 across every request may be. */
  overallP99Ms: number;
  /** Requests that may fail (any status other than 200). */
  maxErrors: number;
  /** A run with fewer samples than this did not exercise the server and fails. */
  minRequests: number;
}

/** Every way the run broke the budget; empty when it is within it. */
export function budgetBreaches(summary: Summary, budget: Budget): string[] {
  const breaches: string[] = [];
  const { overall } = summary;
  if (overall.count < budget.minRequests)
    breaches.push(`only ${overall.count} requests completed; the minimum is ${budget.minRequests}`);
  if (overall.errors > budget.maxErrors)
    breaches.push(`${overall.errors} requests failed; the most allowed is ${budget.maxErrors}`);
  if (overall.p95Ms > budget.overallP95Ms)
    breaches.push(`overall p95 ${overall.p95Ms} ms is over the ${budget.overallP95Ms} ms budget`);
  if (overall.p99Ms > budget.overallP99Ms)
    breaches.push(`overall p99 ${overall.p99Ms} ms is over the ${budget.overallP99Ms} ms budget`);
  for (const [route, stats] of Object.entries(summary.routes)) {
    if (stats.p95Ms > budget.routeP95Ms)
      breaches.push(`${route} p95 ${stats.p95Ms} ms is over the ${budget.routeP95Ms} ms budget`);
  }
  return breaches;
}

/**
 * The backend allows one user 600 reads a minute and one address 300 requests a minute
 * (apps/backend/src/security/rate-limit.decorator.ts). The smoke sends authenticated reads as one
 * user from one address, so its rate has to stay under the lower ceiling or it would measure the
 * rate limiter instead of the server. Returns the reason the plan is refused, or null.
 */
export const MAX_AUTHENTICATED_PER_MINUTE = 240;

export function planProblem(plan: {
  authenticatedPerSecond: number;
  durationSeconds: number;
}): string | null {
  const { authenticatedPerSecond, durationSeconds } = plan;
  if (!(authenticatedPerSecond > 0) || !(durationSeconds > 0))
    return "the rate and the duration must be positive numbers";
  if (durationSeconds > 300) return "the duration must be 300 seconds or less";
  if (authenticatedPerSecond * 60 > MAX_AUTHENTICATED_PER_MINUTE)
    return `${authenticatedPerSecond} authenticated requests a second is over the ${MAX_AUTHENTICATED_PER_MINUTE} a minute this smoke allows itself (the backend's per-address limit is 300 a minute)`;
  return null;
}

/** A Markdown table of the run, for the CI job summary and the baseline document. */
export function summaryMarkdown(summary: Summary, budget: Budget, breaches: string[]): string {
  const row = (name: string, s: RouteStats) =>
    `| ${name} | ${s.count} | ${s.errors} | ${s.p50Ms} | ${s.p95Ms} | ${s.p99Ms} | ${s.maxMs} |`;
  return [
    "### 🏋️ Backend load smoke",
    "",
    breaches.length === 0 ? "Within budget." : `Over budget: ${breaches.join("; ")}.`,
    "",
    `Budget: route p95 ${budget.routeP95Ms} ms, overall p95 ${budget.overallP95Ms} ms, overall p99 ${budget.overallP99Ms} ms, ${budget.maxErrors} errors.`,
    "",
    "| Route | Requests | Errors | p50 ms | p95 ms | p99 ms | Max ms |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: |",
    row("**All**", summary.overall),
    ...Object.entries(summary.routes).map(([route, stats]) => row(`\`${route}\``, stats)),
    "",
  ].join("\n");
}
