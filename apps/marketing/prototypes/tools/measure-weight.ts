/**
 * Measures the JavaScript each prototype adds to the real site, minified and gzipped, and writes
 * prototypes/weights.json for the dev panel. Everything the production site already ships (React,
 * the router, @repo/ui, the finance engine, the marketing components) is left out, so the figure
 * is the prototype's own code plus GSAP or three.js. Lazy chunks are counted separately.
 *
 * Run from apps/marketing: bun prototypes/tools/measure-weight.ts
 */

import fs from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";

const root = path.resolve(import.meta.dir, "..");
const src = path.resolve(root, "../src");

const ENTRIES = {
  p1: "p1/P1.tsx",
  p2: "p2/P2.tsx",
  p3: "p3/P3.tsx",
  p1b: "p1b/P1b.tsx",
  p4: "p4/P4.tsx",
  p5: "p5/P5.tsx",
  p6: "p6/P6.tsx",
  p7: "p7/P7.tsx",
  p8: "p8/P8.tsx",
  p9: "p9/P9.tsx",
  p10: "p10/P10.tsx",
} as const;

/**
 * Shared with production, so not "added": left external. The dev panel and the copied home page
 * content are left out too: the panel never ships and the content would replace HomePage's.
 */
const isShared = (specifier: string, resolved?: string) =>
  /^(react|react-dom|react-router-dom|react-helmet-async|@repo\/ui|@flump\/|lucide-react)/.test(
    specifier,
  ) ||
  /shared\/(PrototypeShell|sections)$/.test(specifier) ||
  (resolved?.startsWith(src) ?? false);

/** Round one lists its CSS; for 4 to 7, every CSS file in the folder plus the shared kit. */
const folderCss = (id: string) => [
  "shared/kit.css",
  ...fs
    .readdirSync(path.join(root, id))
    .filter((f) => f.endsWith(".css"))
    .map((f) => `${id}/${f}`),
];
const CSS: Record<string, readonly string[]> = {
  p1: ["p1/p1.css"],
  p2: ["p2/p2.css"],
  p3: ["p2/p2.css", "p3/p3.css"],
  p1b: folderCss("p1b"),
  p4: folderCss("p4"),
  p5: folderCss("p5"),
  p6: folderCss("p6"),
  p7: folderCss("p7"),
  p8: folderCss("p8"),
  p9: folderCss("p9"),
  p10: folderCss("p10"),
};
const cssGzip = (files: readonly string[]) =>
  gzipSync(files.map((f) => fs.readFileSync(path.join(root, f), "utf8")).join("\n")).length;

type Weight = {
  initialGzip: number;
  lazyGzip: number;
  initialRaw: number;
  lazyRaw: number;
  cssGzip: number;
};
const result: Record<string, Weight> = {};

for (const [id, entry] of Object.entries(ENTRIES)) {
  const outdir = fs.mkdtempSync(path.join(process.env.TMPDIR ?? "/tmp", `proto-${id}-`));
  const build = await Bun.build({
    entrypoints: [path.join(root, entry)],
    outdir,
    minify: true,
    splitting: true,
    target: "browser",
    define: { "process.env.NODE_ENV": '"production"' },
    plugins: [
      {
        name: "externals",
        setup(builder) {
          builder.onResolve({ filter: /.*/ }, (args) => {
            if (args.path.endsWith(".css")) return { path: args.path, external: true };
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
  const weight: Weight = {
    initialGzip: 0,
    lazyGzip: 0,
    initialRaw: 0,
    lazyRaw: 0,
    cssGzip: cssGzip(CSS[id] ?? []),
  };
  // The entry and anything it imports statically load with the page; the other chunks are
  // dynamic imports that load after first paint.
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
    if (staticallyImported) {
      weight.initialGzip += gz;
      weight.initialRaw += text.length;
    } else {
      weight.lazyGzip += gz;
      weight.lazyRaw += text.length;
    }
  }
  result[id] = weight;
  fs.rmSync(outdir, { recursive: true, force: true });
}

const out = {
  measuredAt: new Date().toISOString().slice(0, 10),
  note: "Minified and gzipped (CSS unminified), excluding what production already ships and the dev panel.",
  prototypes: result,
};
fs.writeFileSync(path.join(root, "weights.json"), `${JSON.stringify(out, null, 2)}\n`);
console.log(JSON.stringify(out, null, 2));
