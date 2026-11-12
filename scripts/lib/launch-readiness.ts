/**
 * Launch-readiness checklist evaluation (E24-T10).
 * Items live in docs/launch/readiness.json. Each item has evidence a script can check.
 * Owner attestations are only ever filled by the owner, never by an agent.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

export type Attestation = { by: string; date: string; note: string };

export type Evidence =
  | { kind: "file"; path: string }
  | { kind: "absent"; pattern: string; paths: string[]; exclude?: string; flags?: string }
  | { kind: "present"; pattern: string; paths: string[]; exclude?: string; flags?: string }
  | { kind: "command"; script: string }
  | { kind: "owner"; label: string; attestation: Partial<Attestation> };

export type ReadinessItem = { id: string; text: string; epic: string; evidence: Evidence[] };
export type Readiness = { items: ReadinessItem[] };

export type ItemStatus = "pass" | "fail" | "unattested";
export type EvidenceResult = { evidence: Evidence; status: ItemStatus; detail: string };
export type ItemResult = { item: ReadinessItem; status: ItemStatus; results: EvidenceResult[] };

export type Context = {
  root: string;
  /** Returns the exit code of `bun run <script>`. */
  runScript: (script: string) => number;
};

const SCANNED_EXTENSIONS = /\.(ts|tsx|js|jsx|html|json|md|yml|yaml)$/;
const SKIPPED_DIRS = new Set(["node_modules", "build", "dist", ".turbo", ".git", "coverage"]);

export function defaultContext(root: string): Context {
  return {
    root,
    runScript: (script) =>
      spawnSync("bun", ["run", script], { cwd: root, stdio: "ignore" }).status ?? 1,
  };
}

function collectFiles(root: string, relPath: string, out: string[]): void {
  const abs = resolve(root, relPath);
  if (!existsSync(abs)) return;
  if (statSync(abs).isFile()) {
    out.push(relPath);
    return;
  }
  for (const entry of readdirSync(abs)) {
    if (SKIPPED_DIRS.has(entry)) continue;
    const child = join(relPath, entry);
    if (statSync(resolve(root, child)).isDirectory()) collectFiles(root, child, out);
    else if (SCANNED_EXTENSIONS.test(entry)) out.push(child);
  }
}

/**
 * Files under `paths` whose content matches `pattern` (excluding paths matching `exclude`).
 * Default flags are "im"; set `flags` on the evidence to override (e.g. "" for case-sensitive).
 * A multi-path `present` passes when any one file matches: use one evidence per path to require all.
 */
export function findMatches(
  root: string,
  pattern: string,
  paths: string[],
  exclude?: string,
  flags = "im",
): string[] {
  const re = new RegExp(pattern, flags);
  const skip = exclude ? new RegExp(exclude) : undefined;
  const files: string[] = [];
  for (const path of paths) collectFiles(root, path, files);
  return files.filter(
    (file) => !skip?.test(file) && re.test(readFileSync(resolve(root, file), "utf8")),
  );
}

export function isAttested(attestation: Partial<Attestation>): boolean {
  return [attestation.by, attestation.date, attestation.note].every(
    (value) => typeof value === "string" && value.trim() !== "",
  );
}

function describeHits(hits: string[]): string {
  return `${hits.slice(0, 3).join(", ")}${hits.length > 3 ? ` (+${hits.length - 3})` : ""}`;
}

export function evaluateEvidence(evidence: Evidence, ctx: Context): EvidenceResult {
  switch (evidence.kind) {
    case "file": {
      const ok = existsSync(resolve(ctx.root, evidence.path));
      return {
        evidence,
        status: ok ? "pass" : "fail",
        detail: ok ? `${evidence.path} exists` : `missing ${evidence.path}`,
      };
    }
    case "absent": {
      const hits = findMatches(
        ctx.root,
        evidence.pattern,
        evidence.paths,
        evidence.exclude,
        evidence.flags,
      );
      return {
        evidence,
        status: hits.length === 0 ? "pass" : "fail",
        detail:
          hits.length === 0
            ? `/${evidence.pattern}/ absent`
            : `/${evidence.pattern}/ found in ${describeHits(hits)}`,
      };
    }
    case "present": {
      const hits = findMatches(
        ctx.root,
        evidence.pattern,
        evidence.paths,
        evidence.exclude,
        evidence.flags,
      );
      return {
        evidence,
        status: hits.length > 0 ? "pass" : "fail",
        detail:
          hits.length > 0 ? `/${evidence.pattern}/ present` : `/${evidence.pattern}/ not found`,
      };
    }
    case "command": {
      const code = ctx.runScript(evidence.script);
      return {
        evidence,
        status: code === 0 ? "pass" : "fail",
        detail: `bun run ${evidence.script} exit ${code}`,
      };
    }
    case "owner": {
      const ok = isAttested(evidence.attestation);
      return {
        evidence,
        status: ok ? "pass" : "unattested",
        detail: ok
          ? `${evidence.label}: attested by ${evidence.attestation.by} on ${evidence.attestation.date}`
          : `${evidence.label}: awaiting owner attestation`,
      };
    }
  }
}

export function evaluateItem(item: ReadinessItem, ctx: Context): ItemResult {
  const results = item.evidence.map((evidence) => evaluateEvidence(evidence, ctx));
  const status: ItemStatus = results.some((r) => r.status === "fail")
    ? "fail"
    : results.some((r) => r.status === "unattested") || results.length === 0
      ? "unattested"
      : "pass";
  return { item, status, results };
}

export function evaluateAll(readiness: Readiness, ctx: Context): ItemResult[] {
  return readiness.items.map((item) => evaluateItem(item, ctx));
}

export function exitCodeFor(results: ItemResult[], strict: boolean): number {
  return strict && results.some((r) => r.status !== "pass") ? 1 : 0;
}

export function isStrict(argv: string[], env: Record<string, string | undefined>): boolean {
  return argv.includes("--strict") || env.FLUMP_LAUNCH === "true";
}

const LABEL: Record<ItemStatus, string> = { pass: "PASS", fail: "FAIL", unattested: "UNATTESTED" };

export function summarise(results: ItemResult[]): string {
  const count = (s: ItemStatus) => results.filter((r) => r.status === s).length;
  return `${count("pass")} pass, ${count("fail")} fail, ${count("unattested")} unattested of ${results.length}`;
}

export function renderText(results: ItemResult[]): string {
  const lines = results.map((r) => {
    const open = r.results
      .filter((e) => e.status !== "pass")
      .map((e) => `    - ${e.detail}`)
      .join("\n");
    return `${LABEL[r.status].padEnd(10)} ${r.item.id}  ${r.item.text}${open ? `\n${open}` : ""}`;
  });
  return `${lines.join("\n")}\n\n${summarise(results)}`;
}

export function renderMarkdown(results: ItemResult[]): string {
  const rows = results.map((r) => {
    const open = r.results
      .filter((e) => e.status !== "pass")
      .map((e) => e.detail)
      .join("; ");
    const cell = (s: string) => s.replace(/\|/g, "\\|");
    return `| ${LABEL[r.status]} | ${r.item.id} | ${r.item.epic} | ${cell(r.item.text)} | ${cell(open)} |`;
  });
  return [
    "| Status | Id | Epic | Item | Open evidence |",
    "| --- | --- | --- | --- | --- |",
    ...rows,
    "",
    summarise(results),
  ].join("\n");
}

/** Text of every `- [ ]` line under the "Launch-readiness checklist" heading. */
export function parseChecklist(epicsText: string): string[] {
  const lines = epicsText.split("\n");
  const start = lines.findIndex((l) => /^#+\s+Launch-readiness checklist/.test(l));
  if (start === -1) return [];
  const out: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (/^#{1,3}\s/.test(line)) break;
    const match = /^- \[ \] (.+)$/.exec(line);
    if (match) out.push(match[1]);
  }
  return out;
}

export function loadReadiness(root: string): Readiness {
  return JSON.parse(readFileSync(resolve(root, "docs/launch/readiness.json"), "utf8"));
}
