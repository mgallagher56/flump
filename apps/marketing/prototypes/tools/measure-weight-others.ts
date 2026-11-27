/**
 * measure-weight.ts for the other pages (round one of OTHER-PAGES-PLAN), per scene level. Same
 * method: minified and gzipped, everything production already ships left out (React, the router,
 * @repo/ui, the marketing components and copy), and the dev shell left out. Writes
 * prototypes/others/weights.json for the dev panel; prototype 11's weights.json is not touched.
 *
 * Per level: the first-load script and CSS are the same at every level; the lazy script is GSAP
 * (and anything else loaded after first paint) at S0, plus the orb scene chunk (three.js) at S1
 * and S2. "none" (legal only) is production's page unchanged, so it adds nothing.
 *
 * Run from apps/marketing: bun prototypes/tools/measure-weight-others.ts
 */

import fs from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";

const root = path.resolve(import.meta.dir, "..");
const src = path.resolve(root, "../src");

const ENTRIES = {
  features: "others/pages/FeaturesIndex.tsx",
  area: "others/pages/AreaPage.tsx",
  pricing: "others/pages/Pricing.tsx",
  privacy: "others/pages/Privacy.tsx",
  ai: "others/pages/AiConnection.tsx",
  preview: "others/pages/Preview.tsx",
  security: "others/pages/Security.tsx",
  contact: "others/pages/Contact.tsx",
  terms: "others/pages/Terms.tsx",
  "not-found": "others/pages/NotFound.tsx",
} as const;
const PAGE_ENTRY = {
  features: "features",
  pay: "area",
  debt: "area",
  pricing: "pricing",
  privacy: "privacy",
  ai: "ai",
  preview: "preview",
  security: "security",
  contact: "contact",
  terms: "terms",
  "not-found": "not-found",
} as const;
const LEVELS = {
  features: ["s0", "s1", "s2"],
  pay: ["s0", "s1", "s2"],
  debt: ["s0", "s1", "s2"],
  pricing: ["s0", "s1", "s2"],
  privacy: ["none", "s0", "s1", "s2"],
  ai: ["s0", "s1", "s2"],
  preview: ["s0", "s1", "s2"],
  security: ["s0", "s1", "s2"],
  contact: ["s0", "s1", "s2"],
  terms: ["none", "s0"],
  "not-found": ["none", "s0"],
} as const;

/** The dev shell (panel, switch) never ships; production code and packages are already shipped. */
const isShared = (specifier: string, resolved?: string) =>
  /^(react|react-dom|react-router-dom|react-helmet-async|@repo\/ui|@flump\/|lucide-react)/.test(
    specifier,
  ) ||
  /(OtherShell|shared\/PrototypeShell)$/.test(specifier) ||
  (resolved?.startsWith(src) ?? false);

/** Every CSS file the entry reaches through static relative imports (not the dev shell's). */
function cssOf(entry: string): string[] {
  const seen = new Set<string>();
  const css = new Set<string>();
  const visit = (file: string) => {
    if (seen.has(file)) return;
    seen.add(file);
    const text = fs.readFileSync(file, "utf8");
    for (const match of text.matchAll(/^import\s+(?:[^"']*from\s+)?["'](\.[^"']+)["'];?$/gm)) {
      const spec = match[1] ?? "";
      const target = path.resolve(path.dirname(file), spec);
      if (target.startsWith(src) || /OtherShell$/.test(spec)) continue;
      if (spec.endsWith(".css")) {
        css.add(target);
        continue;
      }
      if (spec.endsWith(".json")) continue;
      const file2 = [".tsx", ".ts", "/index.tsx", "/index.ts"]
        .map((ext) => target + ext)
        .find((f) => fs.existsSync(f));
      if (file2) visit(file2);
    }
  };
  visit(path.join(root, entry));
  // The shell's own page CSS (others.css, kit3.css) ships with every page; its panel CSS does not.
  css.add(path.join(root, "others/others.css"));
  css.add(path.join(root, "shared/kit3.css"));
  // Round two's own CSS ships with its pages (blocks2 imports it).
  return [...css];
}

type Measured = { initialGzip: number; cssGzip: number; lazyBase: number; lazyScene: number };
const measured: Record<string, Measured> = {};

for (const [id, entry] of Object.entries(ENTRIES)) {
  const outdir = fs.mkdtempSync(path.join(process.env.TMPDIR ?? "/tmp", `others-${id}-`));
  const build = await Bun.build({
    entrypoints: [path.join(root, entry)],
    outdir,
    minify: true,
    splitting: true,
    target: "browser",
    define: {
      "process.env.NODE_ENV": '"production"',
      "import.meta.env.VITE_SHOW_PAID_PLAN": '"true"',
    },
    plugins: [
      {
        name: "externals",
        setup(builder) {
          builder.onResolve({ filter: /.*/ }, (args) => {
            if (args.path.endsWith(".css") || args.path.endsWith(".json"))
              return { path: args.path, external: true };
            if (isShared(args.path)) return { path: args.path, external: true };
            if (args.path.startsWith(".")) {
              const resolved = path.resolve(path.dirname(args.importer), args.path);
              if (isShared(args.path, resolved)) return { path: args.path, external: true };
            }
            return undefined;
          });
        },
      },
    ],
  });
  if (!build.success) {
    console.error(build.logs);
    process.exit(1);
  }
  const m: Measured = {
    initialGzip: 0,
    cssGzip: gzipSync(
      cssOf(entry)
        .map((f) => fs.readFileSync(f, "utf8"))
        .join("\n"),
    ).length,
    lazyBase: 0,
    lazyScene: 0,
  };
  const entryOutput = build.outputs.find((o) => o.kind === "entry-point");
  const entryText = entryOutput ? await entryOutput.text() : "";
  for (const output of build.outputs) {
    if (!output.path.endsWith(".js")) continue;
    const text = await output.text();
    const gz = gzipSync(text).length;
    const name = path.basename(output.path);
    const staticallyImported =
      output.kind === "entry-point" ||
      new RegExp(`from"\\./${name}"|import"\\./${name}"`).test(entryText);
    if (staticallyImported) m.initialGzip += gz;
    // three.js and the orb scene load only at S1 and S2.
    else if (/WebGLRenderer|createOrbScene|PMREMGenerator/.test(text)) m.lazyScene += gz;
    else m.lazyBase += gz;
  }
  measured[id] = m;
  fs.rmSync(outdir, { recursive: true, force: true });
}

const pages: Record<
  string,
  Record<string, { initialGzip: number; cssGzip: number; lazyGzip: number }>
> = {};
for (const [page, entryId] of Object.entries(PAGE_ENTRY)) {
  const m = measured[entryId];
  if (!m) continue;
  pages[page] = {};
  for (const level of LEVELS[page as keyof typeof LEVELS]) {
    // "none" is production's legal page as it is: none of this code would ship.
    if (level === "none") {
      pages[page][level] = { initialGzip: 0, cssGzip: 0, lazyGzip: 0 };
      continue;
    }
    const lazy = level === "s0" ? m.lazyBase : m.lazyBase + m.lazyScene;
    pages[page][level] = { initialGzip: m.initialGzip, cssGzip: m.cssGzip, lazyGzip: lazy };
  }
}

const out = {
  measuredAt: new Date().toISOString().slice(0, 10),
  note: "Minified and gzipped (CSS unminified), excluding what production already ships and the dev shell. Lazy at S0 is GSAP; S1 and S2 add the orb scene and three.js.",
  pages,
};
fs.writeFileSync(path.join(root, "others/weights.json"), `${JSON.stringify(out, null, 2)}\n`);
console.log(JSON.stringify(out, null, 2));
