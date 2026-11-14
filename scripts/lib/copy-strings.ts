import { parse } from "@babel/parser";

/**
 * Pulls the user-facing strings out of a TS or TSX source file, for the copy guard
 * (scripts/check-copy.ts) and the copy inventory (docs/copy/COPY-AUDIT.md).
 *
 * It is a heuristic, on purpose generous: it keeps JSX text, string props that name copy
 * (label, title, placeholder, aria-label ...), object values under copy-shaped keys, and any
 * other string that reads as prose. It drops imports, types, style calls, console and thrown
 * developer errors. A false positive costs one baseline entry; a miss hides a string from review.
 */

export interface CopyString {
  /** 1-based line of the string's first character. */
  line: number;
  text: string;
  kind: "jsx-text" | "attribute" | "property" | "literal";
}

/** JSX props and object keys whose string value is shown (or read aloud) to the user. */
const COPY_KEYS = new Set([
  "alt",
  "answer",
  "aria-description",
  "aria-label",
  "aria-placeholder",
  "aria-roledescription",
  "aria-valuetext",
  "badge",
  "body",
  "buttonLabel",
  "cancelLabel",
  "caption",
  "confirmLabel",
  "cta",
  "ctaLabel",
  "description",
  "emptyText",
  "errorMessage",
  "eyebrow",
  "heading",
  "helperText",
  "helpText",
  "hint",
  "label",
  "legend",
  "message",
  "note",
  "placeholder",
  "question",
  "subheading",
  "subtitle",
  "summary",
  "tagline",
  "text",
  "title",
  "tooltip",
]);

/** Calls whose string arguments are never copy. */
const NON_COPY_CALLS = new Set([
  "css",
  "cva",
  "sva",
  "cx",
  "require",
  "describe",
  "it",
  "test",
  "expect",
  "invariant",
  "getByTestId",
  "Symbol",
  "useTranslation",
]);
const NON_COPY_CALLEE_OBJECTS = new Set(["console", "logger", "log", "Sentry", "vi"]);
const NON_COPY_CONSTRUCTORS = new Set(["Error", "TypeError", "RangeError", "RegExp", "URL"]);

const HAS_LETTER = /[A-Za-z]/;

/** True when a free-standing string reads as a sentence or label rather than a code value. */
export function looksLikeProse(text: string): boolean {
  const t = text.trim();
  if (t.length < 4 || !/\s/.test(t)) return false;
  // Prose starts with a capital, a digit, a currency sign or a placeholder.
  if (!/^[A-Z0-9£{"'(]/.test(t)) return false;
  const words = t.split(/\s+/).filter((w) => /[A-Za-z]{2,}/.test(w));
  if (words.length < 2) return false;
  // At least one ordinary lower-case word, which CSS values and constants rarely have.
  if (!words.some((w) => /^[("']?[a-z]{2,}[.,:;?!)"']*$/.test(w))) return false;
  // SQL, selectors, paths, class lists.
  if (/^(SELECT|INSERT|UPDATE|DELETE|Bearer)\b/.test(t)) return false;
  if (/^-?[\d.]+(px|rem|em|ms|s|fr|vh|vw|deg)\b/.test(t)) return false;
  if (/[{}]\s*$/.test(t) && /[;:]\s/.test(t) && /\b(px|rem|solid|rgba?)\b/.test(t)) return false;
  return true;
}

function collapse(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

// A loose view of a Babel AST node: enough for a generic walk.
interface AstNode {
  type: string;
  loc?: { start: { line: number } };
  [key: string]: unknown;
}
const isNode = (v: unknown): v is AstNode =>
  typeof v === "object" && v !== null && typeof (v as AstNode).type === "string";

function nameOf(node: unknown): string | undefined {
  if (!isNode(node)) return undefined;
  if (node.type === "Identifier" || node.type === "JSXIdentifier") return node.name as string;
  if (node.type === "StringLiteral") return node.value as string;
  if (node.type === "JSXNamespacedName") return `${nameOf(node.namespace)}:${nameOf(node.name)}`;
  return undefined;
}

function calleeName(callee: unknown): { object?: string; name?: string } {
  if (!isNode(callee)) return {};
  if (callee.type === "Identifier") return { name: callee.name as string };
  if (callee.type === "MemberExpression" || callee.type === "OptionalMemberExpression")
    return { object: nameOf(callee.object), name: nameOf(callee.property) };
  return {};
}

/** Text of a string-like node, with `${...}` shown as `{…}` so rules see the fixed words only. */
function stringValue(node: AstNode): string | undefined {
  if (node.type === "StringLiteral") return node.value as string;
  if (node.type === "TemplateLiteral") {
    const quasis = node.quasis as Array<{ value: { cooked?: string | null; raw: string } }>;
    return quasis.map((q) => q.value.cooked ?? q.value.raw).join("{…}");
  }
  return undefined;
}

const NON_COPY_ATTRS =
  /^(className|class|style|css|id|key|href|to|src|type|role|name|value|variant|size|data-.*)$/;
// TypeScript wrappers that hold a runtime expression; every other TS* node is a type.
const TS_EXPRESSION_WRAPPERS = new Set([
  "TSAsExpression",
  "TSSatisfiesExpression",
  "TSNonNullExpression",
  "TSTypeAssertion",
]);

export function extractCopyStrings(source: string, fileName = "file.tsx"): CopyString[] {
  const ast = parse(source, {
    sourceType: "module",
    sourceFilename: fileName,
    errorRecovery: true,
    plugins: /\.tsx$/.test(fileName) ? ["typescript", "jsx"] : ["typescript"],
  });
  const out: CopyString[] = [];
  const push = (node: AstNode, text: string, kind: CopyString["kind"]) => {
    const t = collapse(text);
    if (t && HAS_LETTER.test(t)) out.push({ line: node.loc?.start.line ?? 0, text: t, kind });
  };

  const visit = (node: AstNode, parent?: AstNode): void => {
    const { type } = node;
    // Whole subtrees that never hold copy.
    if (type === "ImportDeclaration" || type === "ExportAllDeclaration") return;
    if (type.startsWith("TS") && !TS_EXPRESSION_WRAPPERS.has(type)) {
      if (type !== "TSEnumDeclaration" && type !== "TSModuleDeclaration") return;
    }
    if (type === "CallExpression" || type === "OptionalCallExpression") {
      const { object, name } = calleeName(node.callee);
      if ((name && NON_COPY_CALLS.has(name)) || (object && NON_COPY_CALLEE_OBJECTS.has(object)))
        return;
    }
    if (type === "NewExpression") {
      const name = nameOf(node.callee);
      if (name && NON_COPY_CONSTRUCTORS.has(name)) return;
    }
    if (type === "JSXAttribute") {
      const key = nameOf(node.name);
      if (key && NON_COPY_ATTRS.test(key)) return;
    }
    if (type === "JSXText") {
      push(node, node.value as string, "jsx-text");
      return;
    }

    const value = stringValue(node);
    if (value !== undefined) {
      if (parent?.type === "JSXAttribute") {
        const key = nameOf(parent.name);
        if ((key && COPY_KEYS.has(key)) || looksLikeProse(value)) push(node, value, "attribute");
      } else if (parent?.type === "ObjectProperty" && parent.value === node) {
        const key = nameOf(parent.key);
        const named = key && COPY_KEYS.has(key) && /^[A-Z0-9£{]/.test(value.trim());
        if (named || looksLikeProse(value)) push(node, value, "property");
      } else if (parent?.type === "ObjectProperty" && parent.key === node) {
        // An object key, not a value.
      } else if (parent?.type === "ExportNamedDeclaration") {
        // A re-export's module path.
      } else if (looksLikeProse(value)) {
        push(node, value, "literal");
      }
      if (type !== "TemplateLiteral") return;
    }

    for (const key of Object.keys(node)) {
      if (key === "loc" || key === "leadingComments" || key === "trailingComments") continue;
      const child = node[key];
      if (Array.isArray(child)) {
        for (const c of child) if (isNode(c)) visit(c, node);
      } else if (isNode(child)) {
        visit(child, node);
      }
    }
  };
  visit(ast.program as unknown as AstNode);
  return out.sort((a, b) => a.line - b.line);
}

/** Every string value in a locale JSON file, with the line it sits on. */
export function extractJsonStrings(source: string): CopyString[] {
  const out: CopyString[] = [];
  source.split("\n").forEach((line, i) => {
    const m = /^\s*"[^"]+"\s*:\s*"((?:[^"\\]|\\.)*)"\s*,?\s*$/.exec(line);
    if (m?.[1]) out.push({ line: i + 1, text: JSON.parse(`"${m[1]}"`), kind: "property" });
  });
  return out;
}
