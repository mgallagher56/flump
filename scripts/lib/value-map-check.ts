/**
 * The parts of the value-map check that tie the map to the code (columns and browser keys), and
 * the ratchet baseline. Pure functions; scripts/check-value-map.ts does the reading and printing.
 */
import { type Problem, RULES, type ValueMap } from "./value-map";
import {
  type EntityInfo,
  type FoundKey,
  keyCovers,
  type RegistryValueMap,
  SECOND_FORMULA_RULES,
  type SecondFormulaHit,
} from "./value-map-sources";

const REGISTRY = "apps/backend/src/modules/privacy/user-data-registry.ts";

/**
 * Every column of every table in the user-data registry is tied to a fact in the map or marked as
 * holding no fact, and every browser key in the code is listed in the map (and every listed key is
 * still in the code).
 */
export function checkCoverage(input: {
  map: ValueMap;
  entities: EntityInfo[];
  registry: RegistryValueMap[];
  foundKeys: FoundKey[];
}): Problem[] {
  const { map, entities, registry, foundKeys } = input;
  const problems: Problem[] = [];
  const factIds = new Set(map.facts.map((f) => f.id));

  for (const entry of registry) {
    const entity = entities.find((e) => e.className === entry.entity);
    if (!entity) {
      problems.push({
        rule: RULES.deadColumn,
        subject: entry.entity,
        message: `${REGISTRY} lists ${entry.entity}, but no @Entity class of that name is in apps/backend/src/entities. Fix the registry entry`,
      });
      continue;
    }
    const table = entity.table;
    if (!entry.present) {
      problems.push({
        rule: RULES.unmappedColumn,
        subject: table,
        message: `${table} (${entity.className}) has no valueMap in ${REGISTRY}. Add valueMap: { facts: { column: "fact-id" }, notFacts: { column: "reason" } }, or valueMap: { noUserFacts: "reason", columns: [every column] } if no column holds a fact about the user`,
      });
      continue;
    }
    if (entry.noUserFacts !== undefined) {
      if (entry.noUserFacts.trim().length <= 20)
        problems.push({
          rule: RULES.malformed,
          subject: `${table} noUserFacts reason`,
          message: `${table}: valueMap.noUserFacts needs a reason of more than 20 characters in ${REGISTRY}. Say why no column holds a fact about the user`,
        });
      if (!entry.listsColumns)
        problems.push({
          rule: RULES.malformed,
          subject: `${table} noUserFacts columns`,
          message: `${table}: valueMap.noUserFacts must list every column under columns: [...] in ${REGISTRY}, so a new column still has to be placed`,
        });
    }
    // A no-user-facts table's columns carry the table's reason, checked once above.
    if (entry.noUserFacts === undefined)
      for (const [property, reason] of entry.notFacts)
        if (reason !== undefined && reason.trim().length <= 10)
          problems.push({
            rule: RULES.malformed,
            subject: `${table}.${property} reason`,
            message: `${table}.${property}: the valueMap.notFacts reason "${reason}" is too short in ${REGISTRY}. Say in more than 10 characters why it holds no fact`,
          });
    const properties = new Set(entity.columns.map((c) => c.property));
    for (const { property, column } of entity.columns) {
      const fact = entry.facts.get(property);
      const subject = `${table}.${column}`;
      if (fact !== undefined && entry.notFacts.has(property)) {
        problems.push({
          rule: RULES.malformed,
          subject,
          message: `${subject} is in both valueMap.facts and valueMap.notFacts of ${entity.className} in ${REGISTRY}. Keep one`,
        });
      } else if (fact !== undefined && !factIds.has(fact)) {
        problems.push({
          rule: RULES.unmappedColumn,
          subject,
          message: `${subject} is tied to fact "${fact}", which is not in docs/system/value-map.yaml. Add the fact to the map, or tie the column to an existing fact id in ${REGISTRY}`,
        });
      } else if (fact === undefined && !entry.notFacts.has(property)) {
        problems.push({
          rule: RULES.unmappedColumn,
          subject,
          message:
            entry.noUserFacts !== undefined
              ? `${subject} (${entity.className}.${property}) is not in the value map. ${table} is marked noUserFacts in ${REGISTRY}: add the column to its columns list if it holds no fact about the user, or replace noUserFacts with facts and notFacts if it does`
              : `${subject} (${entity.className}.${property}) is not in the value map. In ${REGISTRY}, add it to valueMap.facts with the id of the fact it holds (add the fact to docs/system/value-map.yaml if it is new), or to valueMap.notFacts with the reason it holds no fact`,
        });
      }
    }
    for (const property of [...entry.facts.keys(), ...entry.notFacts.keys()]) {
      if (!properties.has(property))
        problems.push({
          rule: RULES.deadColumn,
          subject: `${table}.${property}`,
          message: `${entity.className}.${property} is in the valueMap of ${REGISTRY} but is not a column of ${table}. Remove it, or rename it to the column's property name`,
        });
    }
  }

  const byKey = new Map<string, FoundKey[]>();
  for (const found of foundKeys) byKey.set(found.key, [...(byKey.get(found.key) ?? []), found]);
  for (const [key, where] of byKey) {
    if (map.browser_storage.some((entry) => keyCovers(entry.key, key))) continue;
    problems.push({
      rule: RULES.unmappedStorageKey,
      subject: key,
      message: `browser key "${key}" (${where.map((w) => `${w.file}:${w.line}`).join(", ")}) is not in the value map. Add it under browser_storage: in docs/system/value-map.yaml with its storage, user_data, the fact it copies (if any), path and note`,
    });
  }
  for (const entry of map.browser_storage) {
    if ([...byKey.keys()].some((key) => keyCovers(entry.key, key))) continue;
    problems.push({
      rule: RULES.deadStorageKey,
      subject: entry.key,
      message: `browser key "${entry.key}" is listed in docs/system/value-map.yaml but no code writes it any more. Remove the entry, or fix the key to how the code spells it now`,
    });
  }
  return problems;
}

// ---------------------------------------------------------------------------------------------
// Baseline
// ---------------------------------------------------------------------------------------------

/** One known problem, keyed `rule:subject`, with the audit finding(s) that explain it. */
export interface BaselineProblem {
  findings: string[];
  note?: string;
}
/** Known second-formula warnings in one file: a ceiling per rule, and the finding(s). */
export interface BaselineFormulaFile {
  counts: Partial<Record<string, number>>;
  findings: string[];
}
export interface Baseline {
  problems: Record<string, BaselineProblem>;
  secondFormulas: Record<string, BaselineFormulaFile>;
}

export const problemKey = (p: Pick<Problem, "rule" | "subject">) => `${p.rule}:${p.subject}`;

/** Finding ids are the `### XX-n` headings of the audit's FINDINGS.md. */
export const findingIdsIn = (markdown: string): Set<string> =>
  new Set([...markdown.matchAll(/^### ([A-Z]{2,3}-\d+)\b/gm)].map((m) => m[1]));

/** Every baseline entry names at least one finding, and every finding exists. */
export function validateBaseline(baseline: Baseline, findingIds: Set<string>): string[] {
  const errors: string[] = [];
  const check = (owner: string, findings: unknown) => {
    if (!Array.isArray(findings) || findings.length === 0) {
      errors.push(
        `${owner} names no audit finding. Every baseline entry is a known problem with a finding id from docs/audit/system-2026-11/FINDINGS.md`,
      );
      return;
    }
    for (const id of findings)
      if (!findingIds.has(id))
        errors.push(
          `${owner} names finding "${id}", which is not a heading in docs/audit/system-2026-11/FINDINGS.md. Fix the id`,
        );
  };
  for (const [key, entry] of Object.entries(baseline.problems ?? {})) check(key, entry?.findings);
  for (const [file, entry] of Object.entries(baseline.secondFormulas ?? {})) {
    check(file, entry?.findings);
    for (const [rule, count] of Object.entries(entry?.counts ?? {}))
      if (!Number.isInteger(count) || (count as number) < 1)
        errors.push(
          `${file} [${rule}] has count ${count}. Counts are whole numbers of at least 1; remove the rule when it reaches 0`,
        );
  }
  return errors;
}

/** Splits today's problems into new failures and known ones, and lists fixed baseline entries. */
export function compareProblems(problems: Problem[], baseline: Baseline) {
  const keys = new Set(problems.map(problemKey));
  return {
    failures: problems.filter((p) => !baseline.problems?.[problemKey(p)]),
    known: problems.filter((p) => baseline.problems?.[problemKey(p)]),
    stale: Object.keys(baseline.problems ?? {}).filter((key) => !keys.has(key)),
  };
}

interface FreshWarning extends SecondFormulaHit {
  message: string;
}
interface KnownWarning extends SecondFormulaHit {
  findings: string[];
}

/**
 * Second-formula warnings: new ones (a file the baseline does not list, or a rule it has no count
 * for) with what to do, files over their ceiling, files under it, and the known ones.
 */
export function compareWarnings(hits: SecondFormulaHit[], baseline: Baseline, map: ValueMap) {
  const fresh: FreshWarning[] = [];
  const known: KnownWarning[] = [];
  const overBaseline: string[] = [];
  const improved: string[] = [];
  const advice = (ruleId: string) => {
    const rule = SECOND_FORMULA_RULES.find((r) => r.id === ruleId);
    const homes = (rule?.figures ?? [])
      .map((id) => map.figures.find((f) => f.id === id))
      .filter((f) => f !== undefined)
      .map((f) => `${f.id}: ${f.computed_by.function}`);
    return `Possible second formula: ${rule?.hint}. If this is a figure shown elsewhere, read it from the engine instead (${homes.join("; ")}). If it is arithmetic on what-if inputs, leave it: this rule only warns`;
  };

  const groups = new Map<string, SecondFormulaHit[]>();
  for (const hit of hits) {
    const key = `${hit.file}\u0000${hit.rule}`;
    groups.set(key, [...(groups.get(key) ?? []), hit]);
  }
  for (const [key, group] of groups) {
    const [file, rule] = key.split("\u0000");
    const entry = baseline.secondFormulas?.[file];
    const ceiling = entry?.counts?.[rule];
    if (!entry || ceiling === undefined) {
      for (const hit of group) fresh.push({ ...hit, message: advice(rule) });
    } else if (group.length > ceiling) {
      overBaseline.push(
        `${file} [second-formula/${rule}] ${group.length} matches, more than the ${ceiling} known (${entry.findings.join(", ")}) at lines ${group.map((h) => h.line).join(", ")}. ${advice(rule)}`,
      );
    } else {
      for (const hit of group) known.push({ ...hit, findings: entry.findings });
      if (group.length < ceiling)
        improved.push(`${file} [${rule}] ${group.length} matches, baseline ${ceiling}`);
    }
  }
  for (const [file, entry] of Object.entries(baseline.secondFormulas ?? {}))
    for (const [rule, ceiling] of Object.entries(entry.counts))
      if (!groups.has(`${file}\u0000${rule}`))
        improved.push(`${file} [${rule}] 0 matches, baseline ${ceiling}`);
  return { fresh, known, overBaseline, improved };
}

/**
 * The baseline after fixes: problems that are gone are dropped, warning ceilings fall to today's
 * count. Nothing is ever added or raised: a new problem is fixed, not baselined.
 */
export function lowerBaseline(
  baseline: Baseline,
  problems: Problem[],
  hits: SecondFormulaHit[],
): Baseline {
  const keys = new Set(problems.map(problemKey));
  const next: Baseline = { problems: {}, secondFormulas: {} };
  for (const [key, entry] of Object.entries(baseline.problems ?? {}))
    if (keys.has(key)) next.problems[key] = entry;
  for (const [file, entry] of Object.entries(baseline.secondFormulas ?? {})) {
    const counts: Partial<Record<string, number>> = {};
    for (const [rule, ceiling] of Object.entries(entry.counts)) {
      const now = hits.filter((h) => h.file === file && h.rule === rule).length;
      const lowered = Math.min(now, ceiling ?? 0);
      if (lowered > 0) counts[rule] = lowered;
    }
    if (Object.keys(counts).length > 0) next.secondFormulas[file] = { ...entry, counts };
  }
  return next;
}
