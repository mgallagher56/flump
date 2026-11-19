/**
 * The value map (docs/system/value-map.yaml): its format, its structural rules and the generated
 * views. Shared by scripts/generate-value-map.ts (writes the views) and scripts/check-value-map.ts
 * (the "One home per value" check in check:laws).
 *
 * Everything here is pure: callers pass the parsed map and a way to ask whether a file exists, so
 * the unit tests can run it on a fixture map.
 */

export const VERDICTS = ["holds", "manual", "broken", "duplicated", "not-checked"] as const;
export type Verdict = (typeof VERDICTS)[number];

/** Statuses of a second store of a fact (other_stores). */
export const STORE_STATUSES = ["duplicate", "cache", "derived", "legacy", "default"] as const;
/** Statuses of a second code path for a figure (other_paths). */
export const CODE_PATH_STATUSES = ["duplicate", "wrapper", "legacy", "default"] as const;
/** Where a browser key lives. */
export const BROWSER_STORAGES = ["localStorage", "sessionStorage", "cookie"] as const;

/** The engine package: the only home for a shared figure's function (one engine function per figure). */
export const ENGINE_ROOT = "packages/finance-engine/src/";

export interface Surface {
  id: string;
  name: string;
  kind: string;
  route?: string;
  path: string;
}
export interface Link {
  id: string;
  group: string;
  statement: string;
  verdict: Verdict;
  checked?: string;
  findings?: string[];
}
export interface Use {
  surface: string;
  path: string;
  note?: string;
}
export interface Store {
  ref: string;
  path: string;
  status?: string;
  note?: string;
}
export interface Fact {
  id: string;
  name: string;
  area: string;
  source_of_truth: Store;
  other_stores?: Store[];
  writers?: Use[];
  readers?: Use[];
  links?: string[];
  verdict: Verdict;
  findings?: string[];
  note?: string;
}
export interface CodePath {
  function: string;
  path: string;
  status?: string;
  note?: string;
}
export interface Figure {
  id: string;
  name: string;
  area: string;
  computed_by: CodePath;
  other_paths?: CodePath[];
  inputs?: string[];
  shown_on?: Use[];
  links?: string[];
  verdict: Verdict;
  findings?: string[];
  note?: string;
}
/** A browser storage or cookie key. Every key the code writes is listed, user data or not. */
export interface BrowserKey {
  /** The key or cookie name as the code spells it. A trailing `*` means "this prefix". */
  key: string;
  storage: (typeof BROWSER_STORAGES)[number];
  /** True when the key holds a fact about the user (a salary, a debt), even as a copy. */
  user_data: boolean;
  /** The fact it holds a copy of. Required when user_data is true. */
  fact?: string;
  path: string;
  note: string;
}
export interface ValueMap {
  version: number;
  surfaces: Surface[];
  links: Link[];
  facts: Fact[];
  figures: Figure[];
  browser_storage: BrowserKey[];
}

/** Parses the YAML text of a value map. Missing lists become empty lists. */
export function parseValueMap(text: string): ValueMap {
  const parsed = (Bun.YAML.parse(text) ?? {}) as Partial<ValueMap>;
  return {
    version: parsed.version ?? 0,
    surfaces: parsed.surfaces ?? [],
    links: parsed.links ?? [],
    facts: parsed.facts ?? [],
    figures: parsed.figures ?? [],
    browser_storage: parsed.browser_storage ?? [],
  };
}

/** A path may carry a `:line` suffix; only the file is checked. */
export function fileOf(path: string): string {
  return path.replace(/:\d+([-,]\d+)*$/, "");
}

/** A function name that can be looked up in its file (`selectNetWorth`, `PortfolioSnapshot.getX`). */
const SYMBOL = /^[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*)?$/;
export const isSymbol = (name: string): boolean => SYMBOL.test(name);

/**
 * One problem with the map. `rule` groups problems for the baseline and the README; `subject` is
 * the stable key the baseline uses (an id, a key or a table.column), never a line number.
 */
export interface Problem {
  rule: Rule;
  subject: string;
  message: string;
}

export const RULES = {
  malformed: "malformed",
  deadPath: "dead-path",
  deadSymbol: "dead-symbol",
  deadColumn: "dead-column",
  unmappedColumn: "unmapped-column",
  unmappedStorageKey: "unmapped-storage-key",
  deadStorageKey: "dead-storage-key",
  noSourceOfTruth: "no-source-of-truth",
  figureOutsideEngine: "figure-outside-engine",
  staleViews: "stale-views",
} as const;
export type Rule = (typeof RULES)[keyof typeof RULES];

/** What the structural rules need from the repository. */
export interface RepoView {
  /** True when the repo-relative file exists. */
  exists(path: string): boolean;
  /** The text of a repo-relative file, or null. */
  read(path: string): string | null;
  /** Columns by table name (database names), for refs like `accounts.balance`. */
  tables: ReadonlyMap<string, ReadonlySet<string>>;
}

const FIX_PATH =
  "Fix the path in docs/system/value-map.yaml to where the code lives now, or remove the entry if the code is gone";

/**
 * The structural rules: ids, statuses and required fields (malformed), every path exists
 * (dead-path), every named function is still in its file (dead-symbol), every `table.column` ref
 * names a real column (dead-column), and each fact and figure has one home (no-source-of-truth,
 * figure-outside-engine).
 */
export function validateMap(map: ValueMap, repo: RepoView): Problem[] {
  const problems: Problem[] = [];
  const add = (rule: Rule, subject: string, message: string) =>
    problems.push({ rule, subject, message });
  const malformed = (subject: string, message: string) =>
    add(RULES.malformed, subject, `${subject}: ${message}`);

  const seen = new Set<string>();
  const unique = (kind: string, id: string | undefined) => {
    if (!id) {
      malformed(`${kind} (no id)`, `every ${kind} needs an id. Add a stable kebab-case id`);
      return;
    }
    const key = `${kind === "figure" ? "fact" : kind}:${id}`;
    if (seen.has(key))
      malformed(
        `${kind} ${id}`,
        `duplicate id "${id}". Ids are unique across facts and figures and never reused: rename one`,
      );
    seen.add(key);
  };
  const pathExists = (owner: string, path: string | undefined) => {
    if (!path) malformed(owner, "missing path. Add the repo-relative file that holds it");
    else if (path.includes(".."))
      malformed(owner, `path must not leave the repository: ${path}. Use a repo-relative path`);
    else if (!repo.exists(fileOf(path)))
      add(
        RULES.deadPath,
        `${owner} -> ${fileOf(path)}`,
        `${owner}: no such file ${path}. ${FIX_PATH}`,
      );
  };
  const symbolExists = (owner: string, fn: string | undefined, path: string | undefined) => {
    if (!fn || !path || !isSymbol(fn) || !repo.exists(fileOf(path))) return;
    const last = fn.split(".").at(-1) as string;
    const text = repo.read(fileOf(path)) ?? "";
    if (!new RegExp(`\\b${last.replace(/\$/g, "\\$")}\\b`).test(text))
      add(
        RULES.deadSymbol,
        `${owner} -> ${fn}`,
        `${owner}: ${fn} is not in ${fileOf(path)}. Point the entry at the file that defines it now, or rename it to match the code`,
      );
  };
  const surfaceIds = new Set(map.surfaces.map((s) => s.id));
  const linkIds = new Set(map.links.map((l) => l.id));
  const factIds = new Set(map.facts.map((f) => f.id));
  const verdictOk = (owner: string, verdict: string | undefined) => {
    if (!VERDICTS.includes(verdict as Verdict))
      malformed(owner, `unknown verdict "${verdict}". Use one of: ${VERDICTS.join(", ")}`);
  };
  const statusOk = (owner: string, status: string | undefined, allowed: readonly string[]) => {
    if (status !== undefined && !allowed.includes(status))
      malformed(owner, `unknown status "${status}". Use one of: ${allowed.join(", ")}`);
  };
  const usesOk = (owner: string, uses: Use[] | undefined) => {
    for (const use of uses ?? []) {
      if (!surfaceIds.has(use.surface))
        malformed(owner, `unknown surface "${use.surface}". Add it under surfaces: or fix the id`);
      pathExists(`${owner} (${use.surface})`, use.path);
    }
  };
  const linksOk = (owner: string, ids: string[] | undefined) => {
    for (const id of ids ?? [])
      if (!linkIds.has(id))
        malformed(owner, `unknown link "${id}". Add it under links: or fix the id`);
  };
  const refOk = (owner: string, ref: string | undefined) => {
    for (const { table, column } of tableRefs(ref ?? "", repo.tables)) {
      const columns = repo.tables.get(table);
      if (!columns)
        add(
          RULES.deadColumn,
          `${owner} -> ${table}`,
          `${owner}: table ${table} does not exist. Fix the ref to the table's name in its @Entity(), or remove the store`,
        );
      else if (column && !columns.has(column))
        add(
          RULES.deadColumn,
          `${owner} -> ${table}.${column}`,
          `${owner}: column ${table}.${column} does not exist. Fix the ref to the column's database name, or remove the store`,
        );
    }
  };

  for (const surface of map.surfaces) {
    unique("surface", surface.id);
    pathExists(`surface ${surface.id}`, surface.path);
  }
  for (const link of map.links) {
    unique("link", link.id);
    verdictOk(`link ${link.id}`, link.verdict);
  }
  for (const fact of map.facts) {
    const owner = `fact ${fact.id}`;
    unique("fact", fact.id);
    verdictOk(owner, fact.verdict);
    if (!fact.name) malformed(owner, "missing name. Add a short plain name");
    if (!fact.area) malformed(owner, "missing area. Add the area it belongs to (pay, accounts...)");
    const truth = fact.source_of_truth;
    if (!truth?.ref) {
      add(
        RULES.noSourceOfTruth,
        fact.id,
        `${owner}: no source of truth. Name the one table and column that holds this fact under source_of_truth`,
      );
    } else {
      if (/^not stored\b/i.test(truth.ref))
        add(
          RULES.noSourceOfTruth,
          fact.id,
          `${owner}: the fact is not stored anywhere ("${truth.ref}"). Store it in one column and name that column as its source_of_truth`,
        );
      pathExists(`${owner} source of truth`, truth.path);
      refOk(`${owner} source of truth`, truth.ref);
    }
    for (const store of fact.other_stores ?? []) {
      statusOk(`${owner} store ${store.ref}`, store.status, STORE_STATUSES);
      pathExists(`${owner} store ${store.ref}`, store.path);
      refOk(`${owner} store`, store.ref);
    }
    usesOk(`${owner} writer`, fact.writers);
    usesOk(`${owner} reader`, fact.readers);
    linksOk(owner, fact.links);
  }
  for (const figure of map.figures) {
    const owner = `figure ${figure.id}`;
    unique("figure", figure.id);
    verdictOk(owner, figure.verdict);
    const by = figure.computed_by;
    if (!by?.function || !by.path) {
      malformed(owner, "missing computed_by. Name the engine function and its file");
    } else {
      pathExists(`${owner} computed_by`, by.path);
      symbolExists(`${owner} computed_by`, by.function, by.path);
      if (!isSymbol(by.function) || !fileOf(by.path).startsWith(ENGINE_ROOT))
        add(
          RULES.figureOutsideEngine,
          figure.id,
          `${owner}: computed by "${by.function}" in ${fileOf(by.path)}, not by one function in ${ENGINE_ROOT}. Move the arithmetic into an engine function (a picture selector) and name it under computed_by`,
        );
    }
    for (const other of figure.other_paths ?? []) {
      statusOk(`${owner} other path ${other.function}`, other.status, CODE_PATH_STATUSES);
      pathExists(`${owner} other path`, other.path);
      symbolExists(`${owner} other path`, other.function, other.path);
    }
    for (const input of figure.inputs ?? [])
      if (!factIds.has(input))
        malformed(owner, `unknown input fact "${input}". Use a fact id from facts:`);
    usesOk(`${owner} shown_on`, figure.shown_on);
    linksOk(owner, figure.links);
  }
  const keys = new Set<string>();
  for (const entry of map.browser_storage) {
    const owner = `browser key ${entry.key}`;
    if (!entry.key)
      malformed("browser key (no key)", "every entry needs the key as the code spells it");
    else if (keys.has(`${entry.storage}:${entry.key}`))
      malformed(owner, `listed twice for ${entry.storage}. Keep one entry`);
    keys.add(`${entry.storage}:${entry.key}`);
    if (!BROWSER_STORAGES.includes(entry.storage))
      malformed(
        owner,
        `unknown storage "${entry.storage}". Use one of: ${BROWSER_STORAGES.join(", ")}`,
      );
    if (typeof entry.user_data !== "boolean")
      malformed(owner, "user_data must be true or false: does the key hold a fact about the user?");
    if (entry.user_data && !entry.fact)
      malformed(
        owner,
        "holds user data but names no fact. Add fact: with the id of the fact it copies",
      );
    if (entry.fact && !factIds.has(entry.fact))
      malformed(owner, `unknown fact "${entry.fact}". Use a fact id from facts:`);
    if (!entry.note) malformed(owner, "missing note. Say in a few words what the key holds");
    pathExists(owner, entry.path);
  }
  return problems;
}

/**
 * The database references in a store's `ref`, for refs that start with a table name:
 * `accounts.balance`, `user_profiles.pension_percent, pension_employer_percent`, `budget_entries
 * income row`, `accounts.ownership, accounts.share_percent`. Free text ("engine default 45,000",
 * "localStorage flump_x", "any account_details row") names no table and is skipped.
 *
 * A first word with a dot (`table.column`) is always a reference, so a renamed table is caught. A
 * first word with no dot is a reference only when it is a known table, or snake_case with an
 * underscore (so `budget_entres income row` is caught as a dead table).
 */
export function tableRefs(
  ref: string,
  tables: ReadonlyMap<string, ReadonlySet<string>>,
): { table: string; column?: string }[] {
  const head = /^([a-z][a-z0-9_]*)(?:\.([a-z][a-z0-9_]*))?(?=$|[\s,])/.exec(ref);
  if (!head) return [];
  const [, table, column] = head;
  if (!column) {
    return tables.has(table) || table.includes("_") ? [{ table }] : [];
  }
  const refs: { table: string; column?: string }[] = [{ table, column }];
  for (const part of ref.slice(head[0].length).split(",").slice(1)) {
    const word = /^\s*([a-z][a-z0-9_]*)(?:\.([a-z][a-z0-9_]*))?(?=$|[\s,])/.exec(part);
    if (!word) continue;
    if (word[2]) refs.push({ table: word[1], column: word[2] });
    else refs.push({ table, column: word[1] });
  }
  return refs;
}

// ---------------------------------------------------------------------------------------------
// Views
// ---------------------------------------------------------------------------------------------

const VERDICT_LABEL: Record<Verdict, string> = {
  holds: "Holds",
  manual: "Holds with a manual step or a delay",
  broken: "Broken",
  duplicated: "Duplicated (two stores that can disagree)",
  "not-checked": "Not checked",
};

export const VIEW_HEADER =
  "<!-- Generated by scripts/generate-value-map.ts from docs/system/value-map.yaml. Do not edit by hand. -->\n\n";

const code = (text: string) => `\`${text}\``;
const cell = (text: string | undefined) => (text ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");
const list = (items: string[] | undefined) => (items?.length ? items.join(", ") : "none");

function useLines(map: ValueMap, uses: Use[] | undefined): string {
  if (!uses?.length) return "- none\n";
  const name = (id: string) => map.surfaces.find((s) => s.id === id)?.name ?? id;
  return uses
    .map((u) => `- ${name(u.surface)}: ${code(u.path)}${u.note ? ` (${u.note})` : ""}\n`)
    .join("");
}

function byFact(map: ValueMap): string {
  let out = `${VIEW_HEADER}# Value map: by fact and by figure\n\n`;
  out +=
    "Where each value is stored, entered and used. One entry per stored fact, then one per derived figure.\n\n";
  const areas = [...new Set([...map.facts, ...map.figures].map((v) => v.area))];
  out += "## Contents\n\n| Value | Kind | Area | Verdict |\n|---|---|---|---|\n";
  for (const fact of map.facts)
    out += `| [${cell(fact.name)}](#${fact.id}) | fact | ${fact.area} | ${VERDICT_LABEL[fact.verdict]} |\n`;
  for (const figure of map.figures)
    out += `| [${cell(figure.name)}](#${figure.id}) | figure | ${figure.area} | ${VERDICT_LABEL[figure.verdict]} |\n`;
  for (const area of areas) {
    out += `\n## Area: ${area}\n`;
    for (const fact of map.facts.filter((f) => f.area === area)) {
      out += `\n### ${fact.name}\n\n<a id="${fact.id}"></a>\n\n`;
      out += `- Id: ${code(fact.id)} (stored fact)\n`;
      out += `- Verdict: ${VERDICT_LABEL[fact.verdict]}. Findings: ${list(fact.findings)}. Links: ${list(fact.links)}.\n`;
      const truth = fact.source_of_truth;
      out += `- Source of truth: ${code(truth.ref)} in ${code(truth.path)}${truth.note ? ` (${truth.note})` : ""}\n`;
      if (fact.note) out += `- Note: ${fact.note}\n`;
      out += "\nOther stores:\n\n";
      out += fact.other_stores?.length
        ? fact.other_stores
            .map(
              (s) =>
                `- ${code(s.ref)} [${s.status ?? "duplicate"}] in ${code(s.path)}${s.note ? ` (${s.note})` : ""}\n`,
            )
            .join("")
        : "- none\n";
      out += `\nEntered or changed by:\n\n${useLines(map, fact.writers)}`;
      out += `\nRead by:\n\n${useLines(map, fact.readers)}`;
    }
    for (const figure of map.figures.filter((f) => f.area === area)) {
      out += `\n### ${figure.name}\n\n<a id="${figure.id}"></a>\n\n`;
      out += `- Id: ${code(figure.id)} (derived figure)\n`;
      out += `- Verdict: ${VERDICT_LABEL[figure.verdict]}. Findings: ${list(figure.findings)}. Links: ${list(figure.links)}.\n`;
      out += `- Computed by: ${code(figure.computed_by.function)} in ${code(figure.computed_by.path)}\n`;
      out += `- Built from: ${list(figure.inputs?.map(code))}\n`;
      if (figure.note) out += `- Note: ${figure.note}\n`;
      out += "\nOther code paths that compute it:\n\n";
      out += figure.other_paths?.length
        ? figure.other_paths
            .map(
              (p) =>
                `- ${code(p.function)} [${p.status ?? "duplicate"}] in ${code(p.path)}${p.note ? ` (${p.note})` : ""}\n`,
            )
            .join("")
        : "- none\n";
      out += `\nShown on:\n\n${useLines(map, figure.shown_on)}`;
    }
  }
  if (map.browser_storage.length > 0) {
    out += "\n## Browser storage and cookies\n\n";
    out +=
      "Every key the browser code writes. A key that holds user data names the fact it copies; the fact's home is still the database.\n\n";
    out += "| Key | Storage | User data | Copies | Code | Note |\n|---|---|---|---|---|---|\n";
    for (const entry of map.browser_storage)
      out += `| ${code(entry.key)} | ${entry.storage} | ${entry.user_data ? "yes" : "no"} | ${entry.fact ? `[${entry.fact}](#${entry.fact})` : "none"} | ${code(entry.path)} | ${cell(entry.note)} |\n`;
  }
  return out;
}

function byPage(map: ValueMap): string {
  let out = `${VIEW_HEADER}# Value map: by page and tool\n\n`;
  out += "What each page, tool and service writes, reads and shows.\n";
  for (const surface of map.surfaces) {
    const writes = map.facts.filter((f) => f.writers?.some((w) => w.surface === surface.id));
    const reads = map.facts.filter((f) => f.readers?.some((r) => r.surface === surface.id));
    const shows = map.figures.filter((f) => f.shown_on?.some((s) => s.surface === surface.id));
    out += `\n## ${surface.name}\n\n`;
    out += `- Kind: ${surface.kind}${surface.route ? `, route ${code(surface.route)}` : ""}\n`;
    out += `- Code: ${code(surface.path)}\n`;
    out += `- Writes: ${list(writes.map((f) => `[${f.name}](by-fact.md#${f.id})`))}\n`;
    out += `- Reads: ${list(reads.map((f) => `[${f.name}](by-fact.md#${f.id})`))}\n`;
    out += `- Shows figures: ${list(shows.map((f) => `[${f.name}](by-fact.md#${f.id})`))}\n`;
  }
  out += "\n## Matrix\n\nW = writes, R = reads. Facts down, pages and tools across.\n\n";
  out += `| Fact | ${map.surfaces.map((s) => cell(s.name)).join(" | ")} |\n`;
  out += `|---|${map.surfaces.map(() => "---").join("|")}|\n`;
  for (const fact of map.facts) {
    const cells = map.surfaces.map((s) => {
      const w = fact.writers?.some((u) => u.surface === s.id) ? "W" : "";
      const r = fact.readers?.some((u) => u.surface === s.id) ? "R" : "";
      return w + r;
    });
    out += `| ${cell(fact.name)} | ${cells.join(" | ")} |\n`;
  }
  return out;
}

function linksView(map: ValueMap): string {
  let out = `${VIEW_HEADER}# Value map: expected links\n\n`;
  out +=
    "Each line is a statement a user would expect to be true, with the verdict from the last audit.\n\n";
  const counts = new Map<Verdict, number>();
  for (const link of map.links) counts.set(link.verdict, (counts.get(link.verdict) ?? 0) + 1);
  out += "| Verdict | Count |\n|---|---|\n";
  for (const verdict of VERDICTS)
    out += `| ${VERDICT_LABEL[verdict]} | ${counts.get(verdict) ?? 0} |\n`;
  for (const group of [...new Set(map.links.map((l) => l.group))]) {
    out += `\n## ${group}\n\n| Id | Statement | Verdict | Checked in | Findings |\n|---|---|---|---|---|\n`;
    for (const link of map.links.filter((l) => l.group === group))
      out += `| ${link.id} | ${cell(link.statement)} | ${VERDICT_LABEL[link.verdict]} | ${link.checked ?? "code"} | ${list(link.findings)} |\n`;
  }
  return out;
}

function connections(map: ValueMap): string {
  let out = `${VIEW_HEADER}# Value map: connections\n\n`;
  out +=
    "One diagram per area. A solid arrow means the page or tool writes the value. A dotted arrow means it reads the value or shows the figure. A thick arrow means a figure is built from a fact.\n";
  const node = (id: string) => id.replace(/[^a-zA-Z0-9]/g, "_");
  const label = (text: string) => text.replace(/"/g, "'");
  for (const area of [...new Set([...map.facts, ...map.figures].map((v) => v.area))]) {
    const facts = map.facts.filter((f) => f.area === area);
    const figures = map.figures.filter((f) => f.area === area);
    const lines = new Set<string>();
    const used = new Set<string>();
    for (const fact of facts) {
      lines.add(`  f_${node(fact.id)}(["${label(fact.name)}"])`);
      for (const w of fact.writers ?? []) {
        used.add(w.surface);
        lines.add(`  s_${node(w.surface)} --> f_${node(fact.id)}`);
      }
      for (const r of fact.readers ?? []) {
        used.add(r.surface);
        lines.add(`  f_${node(fact.id)} -.-> s_${node(r.surface)}`);
      }
    }
    for (const figure of figures) {
      lines.add(`  g_${node(figure.id)}{{"${label(figure.name)}"}}`);
      for (const input of figure.inputs ?? []) {
        const fact = map.facts.find((f) => f.id === input);
        if (fact && fact.area !== area) lines.add(`  f_${node(fact.id)}(["${label(fact.name)}"])`);
        lines.add(`  f_${node(input)} ==> g_${node(figure.id)}`);
      }
      for (const s of figure.shown_on ?? []) {
        used.add(s.surface);
        lines.add(`  g_${node(figure.id)} -.-> s_${node(s.surface)}`);
      }
    }
    const surfaces = map.surfaces
      .filter((s) => used.has(s.id))
      .map((s) => `  s_${node(s.id)}["${label(s.name)}"]`);
    out += `\n## ${area}\n\n\`\`\`mermaid\nflowchart LR\n${[...surfaces, ...lines].join("\n")}\n\`\`\`\n`;
  }
  return out;
}

/** The generated views, by file name, before Biome formats them. */
export function renderViews(map: ValueMap): Record<string, string> {
  return {
    "by-fact.md": byFact(map),
    "by-page.md": byPage(map),
    "links.md": linksView(map),
    "connections.md": connections(map),
  };
}

/**
 * The views whose committed text differs from a fresh render of the map. `format` is applied to
 * the fresh text first (the check passes Biome, as the generator formats on disk).
 */
export function staleViews(
  map: ValueMap,
  committed: (name: string) => string | null,
  format: (name: string, text: string) => string,
): string[] {
  return Object.entries(renderViews(map))
    .filter(([name, text]) => format(name, text) !== committed(name))
    .map(([name]) => name);
}
