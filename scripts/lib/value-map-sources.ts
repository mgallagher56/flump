/**
 * What the value-map check reads from the code: entity columns, the user-data registry's value-map
 * tie, browser storage keys, and arithmetic that may be a second formula for a shared figure.
 *
 * Entities and the registry are read with the TypeScript 6 parser (the compiler API; TypeScript 7
 * has none yet), not by loading the backend, so the check needs no database libraries and stays
 * fast. user-data-registry.spec.ts checks the same tie against TypeORM's real metadata, so a gap in
 * this parser cannot hide a column for long.
 */
import { posix } from "node:path";
import ts from "@typescript/typescript6";

// ---------------------------------------------------------------------------------------------
// Entities
// ---------------------------------------------------------------------------------------------

export interface EntityColumn {
  /** The TypeScript property. */
  property: string;
  /** The database column name (the decorator's `name`, else the property). */
  column: string;
}
export interface EntityInfo {
  className: string;
  table: string;
  columns: EntityColumn[];
}

const COLUMN_DECORATOR =
  /^(?:Column|PrimaryColumn|PrimaryGeneratedColumn|CreateDateColumn|UpdateDateColumn|DeleteDateColumn|VersionColumn)$/;

const parse = (file: string, source: string) =>
  ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

const decoratorCall = (node: ts.Node): { name: string; args: readonly ts.Expression[] }[] =>
  (ts.canHaveDecorators(node) ? (ts.getDecorators(node) ?? []) : []).flatMap((d) => {
    const e = d.expression;
    if (ts.isCallExpression(e) && ts.isIdentifier(e.expression))
      return [{ name: e.expression.text, args: e.arguments }];
    if (ts.isIdentifier(e)) return [{ name: e.text, args: [] }];
    return [];
  });

const stringProp = (obj: ts.ObjectLiteralExpression, key: string): string | undefined => {
  for (const p of obj.properties) {
    if (
      ts.isPropertyAssignment(p) &&
      propName(p.name) === key &&
      ts.isStringLiteralLike(p.initializer)
    )
      return p.initializer.text;
  }
  return undefined;
};

const propName = (name: ts.PropertyName): string | undefined =>
  ts.isIdentifier(name) || ts.isStringLiteralLike(name) ? name.text : undefined;

/** Reads every `@Entity("table")` class in one entity file. */
export function readEntities(file: string, source: string): EntityInfo[] {
  const out: EntityInfo[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isClassDeclaration(node) && node.name) {
      const entity = decoratorCall(node).find((d) => d.name === "Entity");
      if (entity) {
        const first = entity.args[0];
        const table = first && ts.isStringLiteralLike(first) ? first.text : node.name.text;
        const columns: EntityColumn[] = [];
        for (const member of node.members) {
          if (!ts.isPropertyDeclaration(member)) continue;
          const property = propName(member.name);
          const col = decoratorCall(member).find((d) => COLUMN_DECORATOR.test(d.name));
          if (!property || !col) continue;
          let column = property;
          for (const arg of col.args)
            if (ts.isObjectLiteralExpression(arg)) column = stringProp(arg, "name") ?? column;
          columns.push({ property, column });
        }
        out.push({ className: node.name.text, table, columns });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(parse(file, source));
  return out;
}

// ---------------------------------------------------------------------------------------------
// The user-data registry's value-map tie
// ---------------------------------------------------------------------------------------------

export interface RegistryValueMap {
  /** The entity class named by `entity:`. */
  entity: string;
  /** Property -> fact id. */
  facts: Map<string, string>;
  /**
   * Properties that hold no fact (ids, timestamps, operational columns), with the reason when it
   * is a string literal or a string constant in the registry file. For a `noUserFacts` table these
   * are its listed `columns`, with the table's reason.
   */
  notFacts: Map<string, string | undefined>;
  /** Set when the whole table holds no fact about the user, with the reason. */
  noUserFacts?: string;
  /** False for a `noUserFacts` table that does not list its columns. */
  listsColumns: boolean;
  /** False when the entry has no `valueMap` at all. */
  present: boolean;
}

/**
 * Reads the `valueMap` of every `table({ entity, ..., valueMap })` entry in
 * user-data-registry.ts. A spread (`...TECHNICAL_COLUMNS`) of a top-level object constant in the
 * same file is followed.
 */
export function readRegistry(file: string, source: string): RegistryValueMap[] {
  const sf = parse(file, source);
  const constants = new Map<string, ts.ObjectLiteralExpression>();
  for (const stmt of sf.statements) {
    if (!ts.isVariableStatement(stmt)) continue;
    for (const decl of stmt.declarationList.declarations) {
      let init = decl.initializer;
      while (init && (ts.isAsExpression(init) || ts.isSatisfiesExpression(init)))
        init = init.expression;
      if (ts.isIdentifier(decl.name) && init && ts.isObjectLiteralExpression(init))
        constants.set(decl.name.text, init);
    }
  }
  const strings = new Map<string, string>();
  for (const stmt of sf.statements) {
    if (!ts.isVariableStatement(stmt)) continue;
    for (const decl of stmt.declarationList.declarations)
      if (
        ts.isIdentifier(decl.name) &&
        decl.initializer &&
        ts.isStringLiteralLike(decl.initializer)
      )
        strings.set(decl.name.text, decl.initializer.text);
  }
  const stringValue = (e: ts.Expression): string | undefined =>
    ts.isStringLiteralLike(e) ? e.text : ts.isIdentifier(e) ? strings.get(e.text) : undefined;
  const keysOf = (obj: ts.ObjectLiteralExpression, into: Map<string, string | undefined>) => {
    for (const p of obj.properties) {
      if (ts.isSpreadAssignment(p) && ts.isIdentifier(p.expression)) {
        const target = constants.get(p.expression.text);
        if (target) keysOf(target, into);
      } else if (ts.isPropertyAssignment(p)) {
        const key = propName(p.name);
        if (key) into.set(key, stringValue(p.initializer));
      } else if (ts.isShorthandPropertyAssignment(p)) {
        into.set(p.name.text, undefined);
      }
    }
  };

  const out: RegistryValueMap[] = [];
  const visit = (node: ts.Node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "table" &&
      node.arguments[0] &&
      ts.isObjectLiteralExpression(node.arguments[0])
    ) {
      const obj = node.arguments[0];
      let entity: string | undefined;
      let valueMap: ts.ObjectLiteralExpression | undefined;
      for (const p of obj.properties) {
        if (!ts.isPropertyAssignment(p)) continue;
        const key = propName(p.name);
        if (key === "entity" && ts.isIdentifier(p.initializer)) entity = p.initializer.text;
        if (key === "valueMap" && ts.isObjectLiteralExpression(p.initializer))
          valueMap = p.initializer;
      }
      if (entity) {
        const entry: RegistryValueMap = {
          entity,
          facts: new Map(),
          notFacts: new Map(),
          present: valueMap !== undefined,
          listsColumns: true,
        };
        let columns: string[] | undefined;
        for (const p of valueMap?.properties ?? []) {
          if (!ts.isPropertyAssignment(p)) continue;
          const key = propName(p.name);
          if (key === "noUserFacts" && ts.isStringLiteralLike(p.initializer))
            entry.noUserFacts = p.initializer.text;
          if (key === "columns" && ts.isArrayLiteralExpression(p.initializer))
            columns = p.initializer.elements.filter(ts.isStringLiteralLike).map((e) => e.text);
          if (
            (key === "facts" || key === "notFacts") &&
            ts.isObjectLiteralExpression(p.initializer)
          ) {
            const keys = new Map<string, string | undefined>();
            keysOf(p.initializer, keys);
            for (const [prop, value] of keys) {
              if (key === "notFacts") entry.notFacts.set(prop, value);
              else entry.facts.set(prop, value ?? "");
            }
          }
        }
        if (entry.noUserFacts !== undefined) {
          entry.listsColumns = columns !== undefined;
          for (const column of columns ?? []) entry.notFacts.set(column, entry.noUserFacts);
        }
        out.push(entry);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out;
}

// ---------------------------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------------------------

/**
 * Blanks out comments but keeps every newline and the length of each line, so offsets and line
 * numbers in the result match the source. Comments are found by the TypeScript parser (every
 * token's leading and trailing trivia), so a `//` inside a string, an apostrophe in JSX text or a
 * regular expression literal cannot confuse it.
 */
export function blankComments(file: string, source: string): string {
  const kind = file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, kind);
  const ranges = new Map<number, number>();
  const collect = (pos: number) => {
    for (const r of ts.getLeadingCommentRanges(source, pos) ?? []) ranges.set(r.pos, r.end);
    for (const r of ts.getTrailingCommentRanges(source, pos) ?? []) ranges.set(r.pos, r.end);
  };
  const visit = (node: ts.Node) => {
    collect(node.getFullStart());
    collect(node.getEnd());
    for (const child of node.getChildren(sf)) visit(child);
  };
  visit(sf);
  const chars = source.split("");
  for (const [from, to] of ranges)
    for (let i = from; i < to; i++) if (chars[i] !== "\n") chars[i] = " ";
  return chars.join("");
}

const lineAt = (text: string, offset: number) => text.slice(0, offset).split("\n").length;

// ---------------------------------------------------------------------------------------------
// Browser storage keys
// ---------------------------------------------------------------------------------------------

/** Files that touch browser storage or cookies. */
const STORAGE_API =
  /\b(?:localStorage|sessionStorage)\b|document\.cookie|[Ss]et-[Cc]ookie|createCookie|[Cc]ookie|COOKIE/;
/**
 * A key as Flump names them: `flump` (or the WorkOS session cookie `wos`), then `-`, `_` or `.`,
 * optionally behind a `__Host-` or `__Secure-` cookie prefix. A whole string literal with no
 * interpolation.
 */
const KEY_LITERAL = /(["'`])((?:__Host-|__Secure-)?(?:flump|wos)[-_.][A-Za-z0-9_.-]*)\1/g;

export interface FoundKey {
  key: string;
  file: string;
  line: number;
}

/** `const NAME = "literal"` (exported or not) in one file: the names a storage call may use. */
export function stringConstants(source: string): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const m of source.matchAll(
    /\bconst\s+([A-Za-z_$][\w$]*)\s*(?::\s*string\s*)?=\s*(["'`])([^"'`$\\\n]*)\2/g,
  ))
    out.set(m[1], [...(out.get(m[1]) ?? []), m[3]]);
  return out;
}

/** A string constant exported from a file under the storage roots. */
export interface SharedConstant {
  file: string;
  value: string;
}

/**
 * The values `name` may have when this file imports it: the exporting file's value when the import
 * path can be resolved (relative, or `~/` for apps/web/app), else every exported constant of that
 * name, so a package import is still followed by name.
 */
function importedValues(
  file: string,
  code: string,
  name: string,
  shared: ReadonlyMap<string, SharedConstant[]>,
): string[] {
  const candidates = shared.get(name) ?? [];
  const spec = new RegExp(
    `import\\s*(?:type\\s*)?\\{[^}]*\\b${name}\\b[^}]*\\}\\s*from\\s*["']([^"']+)["']`,
  ).exec(code)?.[1];
  let target: string | undefined;
  if (spec?.startsWith(".")) target = posix.normalize(posix.join(posix.dirname(file), spec));
  else if (spec?.startsWith("~/")) target = `apps/web/app/${spec.slice(2)}`;
  if (!target) return candidates.map((c) => c.value);
  const stem = (path: string) => path.replace(/\.tsx?$/, "").replace(/\/index$/, "");
  return candidates.filter((c) => stem(c.file) === stem(target)).map((c) => c.value);
}

/** The first argument of a Storage call: a literal, a template with a literal start, or a name. */
const STORAGE_CALL =
  /\b(?:getItem|setItem|removeItem)\(\s*(?:`\$\{\s*([A-Za-z_$][\w$]*)\s*\}|(["'`])([^"'`$\\\n]*)(\$\{)?|([A-Za-z_$][\w$]*)\s*(\+)?)/g;

/**
 * The storage and cookie keys in one file, or none when the file touches no storage API. Two
 * signals:
 *
 * - any whole string literal named as Flump names its keys (`flump` or the WorkOS cookie `wos`,
 *   then `-`, `_` or `.`, optionally behind `__Host-` or `__Secure-`), wherever it is defined;
 * - the first argument of every `getItem`, `setItem` and `removeItem` call, whatever its name: a
 *   literal, a template that starts with a literal (`flump-draft-${id}` is the prefix
 *   `flump-draft-*`), or a constant defined in this file or exported from another file under the
 *   same roots (`shared`), resolved through the file's import of it when the import path is
 *   relative or `~/`. `PREFIX + id` is the prefix `PREFIX*`.
 *
 * A key built at run time from a parameter (`setItem(key, ...)` with `key` passed in) cannot be
 * followed; its caller's literal or constant is what gets found.
 */
export function findStorageKeys(
  file: string,
  source: string,
  shared: ReadonlyMap<string, SharedConstant[]> = new Map(),
): FoundKey[] {
  if (!STORAGE_API.test(source)) return [];
  const code = blankComments(file, source);
  if (!STORAGE_API.test(code)) return [];
  const local = stringConstants(code);
  const found = new Map<string, FoundKey>();
  const add = (key: string, offset: number) => {
    if (!key || key === "*") return;
    const line = lineAt(code, offset);
    found.set(`${key}\u0000${line}`, { key, file, line });
  };
  for (const m of code.matchAll(KEY_LITERAL)) add(m[2], m.index ?? 0);
  for (const m of code.matchAll(STORAGE_CALL)) {
    const at = m.index ?? 0;
    if (m[2] !== undefined) add(m[4] ? `${m[3]}*` : m[3], at);
    const name = m[1] ?? m[5];
    if (!name) continue;
    const prefix = m[1] !== undefined || m[6] !== undefined;
    for (const value of local.get(name) ?? importedValues(file, code, name, shared))
      add(prefix ? `${value}*` : value, at);
  }
  return [...found.values()];
}

/** True when a key listed in the map (a trailing `*` is a prefix) covers a key found in code. */
export const keyCovers = (listed: string, found: string): boolean => {
  const bare = (key: string) => (key.endsWith("*") ? key.slice(0, -1) : key);
  if (listed.endsWith("*")) return bare(found).startsWith(bare(listed));
  return listed === found;
};

// ---------------------------------------------------------------------------------------------
// Second formulas (warning only)
// ---------------------------------------------------------------------------------------------

/**
 * Patterns that mean a figure is being worked out from saved rows outside the engine. Each names
 * the figures it can produce and the engine function to call instead. They are deliberately
 * narrow: scenario tools do sums on what-if inputs, so these only warn (decision 11).
 */
export const SECOND_FORMULA_RULES = [
  {
    id: "sum-of-saved-amounts",
    pattern:
      /\.reduce\(\s*\(?\s*\w+\s*,\s*(\w+)[^)]*\)?\s*=>[^;]{0,160}?\b\1\??\.(?:balance|amount|monthlyContribution|minimumPayment|monthlyPayment)\w*\b|\+=\s*(?:Number\()?[\w.?]*\.(?:balance|amount|monthlyContribution|minimumPayment|monthlyPayment)\w*\b/g,
    figures: ["net-worth", "total-debts", "savings-total", "left-over"],
    hint: "sums balances, amounts, payments or monthly contributions of saved rows",
  },
  {
    id: "share-arithmetic",
    pattern:
      /[*/]\s*\(?\s*(?:[\w$.?]+\.)?sharePercent\b|\bsharePercent\b\s*\)?\s*(?:\?\?\s*\d+\s*\)?\s*)?[*/]/g,
    figures: ["net-worth", "total-debts", "savings-total"],
    hint: "applies a joint share by hand; call applyAccountShare in packages/finance-engine/src/joint-share.ts",
  },
  {
    id: "monthly-yearly",
    pattern:
      /\b\w*(?:[Ss]alary|[Aa]mount|[Cc]ontribution|[Bb]alance|[Pp]ayment|[Rr]ent|[Ii]ncome|[Cc]ost)\w*\)?\s*[*/]\s*12\b|\b12\s*\*\s*\(?\s*[\w.?]*(?:[Ss]alary|[Aa]mount|[Cc]ontribution|[Bb]alance|[Pp]ayment|[Rr]ent|[Ii]ncome|[Cc]ost)/g,
    figures: ["take-home", "left-over"],
    hint: "converts a saved amount between monthly and yearly",
  },
] as const;
export type SecondFormulaRuleId = (typeof SECOND_FORMULA_RULES)[number]["id"];

export interface SecondFormulaHit {
  file: string;
  line: number;
  rule: SecondFormulaRuleId;
  text: string;
}

/** Every second-formula pattern in one file, with line numbers. */
export function findSecondFormulas(file: string, source: string): SecondFormulaHit[] {
  // Most files match nothing: test the raw text first and parse only the files that might.
  if (!SECOND_FORMULA_RULES.some((rule) => new RegExp(rule.pattern.source).test(source))) return [];
  const code = blankComments(file, source);
  const hits: SecondFormulaHit[] = [];
  for (const rule of SECOND_FORMULA_RULES) {
    for (const m of code.matchAll(rule.pattern)) {
      const offset = m.index ?? 0;
      hits.push({
        file,
        line: lineAt(code, offset),
        rule: rule.id,
        text: m[0].replace(/\s+/g, " ").slice(0, 80),
      });
    }
  }
  return hits.sort((a, b) => a.line - b.line);
}
