export const SEVERITIES = ["low", "moderate", "high", "critical"] as const;
export type Severity = (typeof SEVERITIES)[number];

export type AllowEntry = {
  /** GHSA id (as in the advisory URL) or the numeric advisory id from `bun audit`. */
  id: string;
  package: string;
  severity: Severity;
  reason: string;
  /** ISO date (YYYY-MM-DD), inclusive. */
  expires: string;
};

export type AuditResult = { failures: string[]; warnings: string[] };

export const MAX_ALLOW_DAYS = 90;

type Advisory = {
  ids: string[];
  label: string;
  package: string;
  severity: Severity;
  title: string;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

function parseDate(value: unknown): number | null {
  if (typeof value !== "string" || !ISO_DATE.test(value)) return null;
  const ms = Date.parse(`${value}T00:00:00Z`);
  if (Number.isNaN(ms) || new Date(ms).toISOString().slice(0, 10) !== value) return null;
  return ms;
}

function isSeverity(value: unknown): value is Severity {
  return typeof value === "string" && (SEVERITIES as readonly string[]).includes(value);
}

/** Parses the `bun audit --json` shape (package name -> advisory[]); throws on anything else. */
export function parseReport(report: unknown): Advisory[] {
  if (typeof report !== "object" || report === null || Array.isArray(report)) {
    throw new Error("Unrecognised audit report: expected an object keyed by package name");
  }
  const advisories: Advisory[] = [];
  for (const [pkg, list] of Object.entries(report)) {
    if (!Array.isArray(list)) {
      throw new Error(`Unrecognised audit report: entry for "${pkg}" is not an array`);
    }
    for (const item of list) {
      if (typeof item !== "object" || item === null) {
        throw new Error(`Unrecognised audit report: advisory for "${pkg}" is not an object`);
      }
      const { id, url, title, severity } = item as Record<string, unknown>;
      if (!isSeverity(severity)) {
        throw new Error(`Unrecognised audit report: advisory for "${pkg}" has unknown severity`);
      }
      if (typeof id !== "number" && typeof id !== "string") {
        throw new Error(`Unrecognised audit report: advisory for "${pkg}" has no id`);
      }
      const ghsa = typeof url === "string" ? (url.split("/").pop() ?? "") : "";
      const ids = [String(id), ghsa].filter(Boolean);
      advisories.push({
        ids,
        label: ghsa || String(id),
        package: pkg,
        severity,
        title: typeof title === "string" ? title : "",
      });
    }
  }
  return advisories;
}

export function evaluateAudit(
  report: unknown,
  allow: AllowEntry[],
  opts: { threshold: Severity; today: string },
): AuditResult {
  const todayMs = parseDate(opts.today);
  if (todayMs === null) throw new Error(`Invalid today date: ${opts.today}`);
  const rank = (s: Severity) => SEVERITIES.indexOf(s);
  const advisories = parseReport(report);
  const failures: string[] = [];
  const warnings: string[] = [];

  const active: AllowEntry[] = [];
  for (const entry of allow) {
    const name = `${entry.package}/${entry.id}`;
    const expiresMs = parseDate(entry.expires);
    if (expiresMs === null) {
      failures.push(
        `Allow-list entry ${name} has an invalid expires date "${entry.expires}" (use YYYY-MM-DD)`,
      );
    } else if (expiresMs < todayMs) {
      failures.push(
        `Allow-list entry ${name} expired on ${entry.expires}: fix the advisory or renew with a reason`,
      );
    } else if (expiresMs - todayMs > MAX_ALLOW_DAYS * DAY_MS) {
      failures.push(
        `Allow-list entry ${name} expires ${entry.expires}, more than ${MAX_ALLOW_DAYS} days from today`,
      );
    } else {
      active.push(entry);
    }
    if (!entry.reason?.trim()) failures.push(`Allow-list entry ${name} has no reason`);
    const present = advisories.some((a) => a.package === entry.package && a.ids.includes(entry.id));
    if (!present) {
      warnings.push(`Allow-list entry ${name} no longer appears in the audit report: remove it`);
    }
  }

  for (const adv of advisories) {
    if (rank(adv.severity) < rank(opts.threshold)) continue;
    const allowed = active.some((e) => e.package === adv.package && adv.ids.includes(e.id));
    if (!allowed) {
      failures.push(`${adv.severity} advisory ${adv.label} in ${adv.package}: ${adv.title}`);
    }
  }
  return { failures, warnings };
}
