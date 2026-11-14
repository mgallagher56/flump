/**
 * Builds the React Native theme from the authored tokens (`src/*.ts`). Pure and deterministic:
 * keys are sorted, nothing depends on time or the machine, and the output has no imports.
 * `build-native-tokens.ts` writes the result to `src/native.generated.ts`; the tests regenerate it
 * in memory and compare byte for byte. The translation rules are docs/ux/CROSS-PLATFORM.md section 2.
 */
import {
  colors,
  durations,
  easings,
  fontFamilies,
  fontSizes,
  NAV_BREAKPOINT,
  radii,
  semanticTokens,
  shadows,
  sizes,
  spacing,
  textStyles,
  zIndex,
} from "../src/index.js";

export type Theme = "light" | "dark";

/** Pixels (points on iOS, dp on Android) per rem. The platform font scale multiplies type sizes. */
export const REM = 16;

/**
 * Panda's own breakpoints (from `@pandacss/preset-panda`, not authored here). Mirrored so mobile
 * gets the same steps as numbers; the contract test in packages/ui fails if Panda's change.
 */
export const pandaBreakpoints = {
  sm: "40rem",
  md: "48rem",
  lg: "64rem",
  xl: "80rem",
  "2xl": "96rem",
} as const;

/** Superseded shadow aliases kept for web consumers only; mobile gets the named levels. */
const LEGACY_SHADOWS = new Set(["cardHover", "floating"]);

type Node = { [key: string]: unknown };

const isToken = (node: unknown): node is { value: unknown } =>
  typeof node === "object" && node !== null && "value" in node;

/** Flatten a token tree to Panda paths (`surface.canvas`; a `DEFAULT` leaf takes its group's path). */
export function flatten(tree: Node, trail: string[] = []): Map<string, unknown> {
  const out = new Map<string, unknown>();
  for (const [key, child] of Object.entries(tree)) {
    const path = key === "DEFAULT" ? trail : [...trail, key];
    if (isToken(child)) out.set(path.join("."), child.value);
    else if (typeof child === "object" && child !== null) {
      for (const [p, v] of flatten(child as Node, path)) out.set(p, v);
    }
  }
  return out;
}

/** Natural order: numeric segments compare as numbers, so spacing reads 0, 1, 2 ... 32. */
export function compareKeys(a: string, b: string): number {
  const as = a.split(".");
  const bs = b.split(".");
  for (let i = 0; i < Math.max(as.length, bs.length); i++) {
    const x = as[i];
    const y = bs[i];
    if (x === y) continue;
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    const nx = Number(x);
    const ny = Number(y);
    if (x !== "" && y !== "" && Number.isInteger(nx) && Number.isInteger(ny)) return nx - ny;
    return x < y ? -1 : 1;
  }
  return 0;
}

const sorted = <T>(entries: Iterable<[string, T]>): [string, T][] =>
  [...entries].sort(([a], [b]) => compareKeys(a, b));

/** Pick the comfortable value for a theme. `_compact` is never generated (comfortable only). */
function pick(value: unknown, theme: Theme): unknown {
  if (typeof value === "object" && value !== null && "base" in value) {
    const v = value as { base: unknown; _dark?: unknown };
    return theme === "dark" && v._dark !== undefined ? v._dark : v.base;
  }
  return value;
}

const primitive = new Map<string, unknown>();
for (const [category, tree] of Object.entries({
  colors,
  fontSizes,
  radii,
  shadows,
  sizes,
  spacing,
})) {
  for (const [path, value] of flatten(tree as Node)) primitive.set(`${category}.${path}`, value);
}

const semantic = new Map<string, unknown>();
for (const [category, tree] of Object.entries(semanticTokens)) {
  for (const [path, value] of flatten(tree as Node)) semantic.set(`${category}.${path}`, value);
}

const REF = /\{([^}]+)\}/g;

/** Replace every `{category.path}` reference with its concrete value for the theme. */
export function resolve(value: unknown, theme: Theme, trail: string[] = []): string {
  const raw = pick(value, theme);
  if (typeof raw !== "string")
    throw new Error(`Cannot resolve token value: ${JSON.stringify(raw)}`);
  return raw.replace(REF, (_, ref: string) => {
    if (trail.includes(ref)) throw new Error(`Circular token reference: ${ref}`);
    const target = semantic.has(ref) ? semantic.get(ref) : primitive.get(ref);
    if (target === undefined) throw new Error(`Unresolved token reference: {${ref}}`);
    return resolve(target, theme, [...trail, ref]);
  });
}

/** "16px" -> 16, "1.5rem" -> 24. Any other unit is an error, so a new unit cannot slip through. */
export function toNumber(value: string): number {
  const m = /^(-?[\d.]+)(px|rem)$/.exec(value.trim());
  if (!m?.[1]) throw new Error(`Expected a px or rem length: ${value}`);
  const n = Number(m[1]);
  return m[2] === "rem" ? n * REM : n;
}

const round = (n: number): number => Math.round(n * 100) / 100;

export type Fluid = { min: number; max: number };
type Size = number | Fluid;

/** A fixed rem size, or a fluid `clamp(min, preferred, max)` as its two ends. */
export function toSize(value: string): Size {
  const clamp = /^clamp\(\s*([^,]+),[^,]+,\s*([^)]+)\)$/.exec(value);
  if (clamp?.[1] && clamp[2]) return { min: toNumber(clamp[1]), max: toNumber(clamp[2]) };
  return toNumber(value);
}

const scale = (size: Size, factor: number): Size =>
  typeof size === "number"
    ? round(size * factor)
    : { min: round(size.min * factor), max: round(size.max * factor) };

/** "cubic-bezier(0.2, 0.6, 0.2, 1)" -> [0.2, 0.6, 0.2, 1] for Reanimated's Easing.bezier. */
export function toBezier(value: string): [number, number, number, number] {
  const m = /^cubic-bezier\(([^)]+)\)$/.exec(value);
  const parts = m?.[1]?.split(",").map((p) => Number(p.trim())) ?? [];
  if (parts.length !== 4 || parts.some(Number.isNaN)) throw new Error(`Not a bezier: ${value}`);
  return parts as [number, number, number, number];
}

const FAMILY_ROLES = Object.entries(fontFamilies) as [keyof typeof fontFamilies, string][];

interface TextStyleValue {
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  lineHeight: string;
  letterSpacing?: string;
  fontVariantNumeric?: string;
}

export function nativeTextStyle(style: TextStyleValue) {
  const role = FAMILY_ROLES.find(([, stack]) => stack === style.fontFamily)?.[0];
  if (!role) throw new Error(`Unknown font family: ${style.fontFamily}`);
  const fontSize = toSize(style.fontSize);
  const em = style.letterSpacing ? Number.parseFloat(style.letterSpacing) : 0;
  return {
    fontFamily: role,
    fontSize,
    fontWeight: style.fontWeight,
    lineHeight: scale(fontSize, Number(style.lineHeight)),
    letterSpacing: scale(fontSize, em),
    ...(style.fontVariantNumeric === "tabular-nums" ? { fontVariant: ["tabular-nums"] } : {}),
  };
}

/** Semantic colour paths, sorted: the `ColorKey` union. */
export const colorKeys = sorted(flatten(semanticTokens.colors as Node)).map(([k]) => k);

export function themeColors(theme: Theme): Record<string, string> {
  return Object.fromEntries(
    colorKeys.map((key) => [key, resolve(semantic.get(`colors.${key}`), theme)]),
  );
}

export function themeShadows(theme: Theme): Record<string, string> {
  return Object.fromEntries(
    sorted(flatten(semanticTokens.shadows as Node))
      .filter(([key]) => !LEGACY_SHADOWS.has(key))
      .map(([key, value]) => [key, resolve(value, theme)]),
  );
}

/** Primitive scale merged with the comfortable semantic values of the same category. */
function lengths(category: "spacing" | "radii" | "sizes"): Record<string, number> {
  const merged = new Map<string, number>();
  const prefix = `${category}.`;
  for (const source of [primitive, semantic]) {
    for (const [path, value] of source) {
      if (!path.startsWith(prefix)) continue;
      const key = path.slice(prefix.length);
      // Compact control heights are density-only primitives: mobile is comfortable density.
      if (key.split(".").includes("compact")) continue;
      merged.set(key, toNumber(resolve(value, "light")));
    }
  }
  return Object.fromEntries(sorted(merged));
}

const numbers = (tree: Node, convert: (v: string) => number): Record<string, number> =>
  Object.fromEntries(sorted(flatten(tree)).map(([k, v]) => [k, convert(String(v))]));

export function buildTheme() {
  return {
    light: { colors: themeColors("light"), shadows: themeShadows("light") },
    dark: { colors: themeColors("dark"), shadows: themeShadows("dark") },
    spacing: lengths("spacing"),
    radii: lengths("radii"),
    sizes: lengths("sizes"),
    fontSizes: numbers(fontSizes, toNumber),
    textStyles: Object.fromEntries(
      sorted(flatten(textStyles as Node)).map(([k, v]) => [
        k,
        nativeTextStyle(v as TextStyleValue),
      ]),
    ),
    durations: numbers(durations, (v) => {
      const m = /^(\d+)ms$/.exec(v);
      if (!m) throw new Error(`Expected a duration in ms: ${v}`);
      return Number(m[1]);
    }),
    easings: Object.fromEntries(sorted(flatten(easings)).map(([k, v]) => [k, toBezier(String(v))])),
    zIndex: numbers(zIndex, Number),
    breakpoints: Object.fromEntries(
      sorted([
        ...Object.entries(pandaBreakpoints).map(([k, v]): [string, number] => [k, toNumber(v)]),
        ["nav", toNumber(NAV_BREAKPOINT)],
      ]),
    ),
  };
}

// --- serialisation: emits what Biome's formatter would, so the committed file passes `biome ci` --

const IDENT = /^[A-Za-z_$][\w$]*$/;
const LINE_WIDTH = 100;

function literal(value: unknown, indent: string): string {
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) return `[${value.map((v) => literal(v, indent)).join(", ")}]`;
  const inner = `${indent}  `;
  const lines = Object.entries(value as Node).map(([k, v]) => {
    const key = IDENT.test(k) ? k : JSON.stringify(k);
    const line = `${inner}${key}: ${literal(v, inner)},`;
    // A string too long for one line moves under its key, as Biome prints it (never for keys
    // shorter than indent width + 3, Prettier's "short key" rule that Biome follows).
    return line.length > LINE_WIDTH && typeof v === "string" && key.length >= 5
      ? `${inner}${key}:\n${inner}  ${literal(v, inner)},`
      : line;
  });
  return `{\n${lines.join("\n")}\n${indent}}`;
}

function union(name: string, keys: string[]): string {
  const oneLine = `export type ${name} = ${keys.map((k) => JSON.stringify(k)).join(" | ")};`;
  if (oneLine.length <= LINE_WIDTH) return oneLine;
  return `export type ${name} =${keys.map((k) => `\n  | ${JSON.stringify(k)}`).join("")};`;
}

export function renderNativeTokens(): string {
  const theme = buildTheme();
  const shadowKeys = Object.keys(theme.light.shadows);
  const sections = [
    `/**\n * Flump native theme: generated, do not edit.\n *\n * Source: packages/tokens/src (the same tokens the Panda preset reads).\n * Regenerate: bun run --cwd packages/tokens generate:tokens\n * Rules: docs/ux/CROSS-PLATFORM.md section 2. Comfortable density only.\n */`,
    union("ColorKey", colorKeys),
    union("ShadowKey", shadowKeys),
    `export interface NativeTheme {\n  readonly colors: Readonly<Record<ColorKey, string>>;\n  readonly shadows: Readonly<Record<ShadowKey, string>>;\n}`,
    `export const light: NativeTheme = ${literal(theme.light, "")};`,
    `export const dark: NativeTheme = ${literal(theme.dark, "")};`,
    ...(
      [
        ["spacing", theme.spacing],
        ["radii", theme.radii],
        ["sizes", theme.sizes],
        ["fontSizes", theme.fontSizes],
        ["textStyles", theme.textStyles],
        ["durations", theme.durations],
        ["easings", theme.easings],
        ["zIndex", theme.zIndex],
        ["breakpoints", theme.breakpoints],
      ] as const
    ).map(([name, value]) => `export const ${name} = ${literal(value, "")} as const;`),
  ];
  return `${sections.join("\n\n")}\n`;
}
